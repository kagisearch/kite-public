<script lang="ts">
	import { getFaviconUrls, getIconifyIcon, getFaviconUrlSync, getIconifyIconSync, getFaviconUrlsSync, getLogoDevUrl, getLogoDevTickerUrl, getGoogleFaviconUrl } from '$lib/utils/citationUtils';
	import IconDisplay from './IconDisplay.svelte';
	import { experimental } from '$lib/stores/experimental.svelte.js';
	import { iconService } from '$lib/services/iconService';
	import Icon from './Icon.svelte';
	import { debugInfo } from '$lib/utils/debugUtils';

	// Inline globe SVG for instant loading
	const GLOBE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.721 12.752q.03-.373.029-.752c0-1.524-.35-2.967-.973-4.252a12.8 12.8 0 0 1-4.34 2.709a19 19 0 0 1-.214 4.772a17.2 17.2 0 0 0 5.498-2.477m-7.087 2.798a17.3 17.3 0 0 0 .332-4.647c-.952.227-1.945.347-2.966.347s-2.014-.12-2.966-.347a17.5 17.5 0 0 0 .332 4.647a17.4 17.4 0 0 0 5.268 0m-4.862 1.569a19 19 0 0 0 4.456 0A17.2 17.2 0 0 1 12 21.724a17.2 17.2 0 0 1-2.228-4.605M7.777 15.23a19 19 0 0 1-.214-4.773a12.8 12.8 0 0 1-4.34-2.709a9.7 9.7 0 0 0-.944 5.004a17.2 17.2 0 0 0 5.498 2.477m13.579-.476a9.77 9.77 0 0 1-7.478 6.816a18.6 18.6 0 0 0 1.988-4.718a18.6 18.6 0 0 0 5.49-2.098m-18.712 0c1.682.97 3.53 1.687 5.49 2.098a18.6 18.6 0 0 0 1.988 4.718a9.77 9.77 0 0 1-7.478-6.816M13.878 2.43a9.76 9.76 0 0 1 6.116 3.986a11.3 11.3 0 0 1-3.746 2.504a18.6 18.6 0 0 0-2.37-6.49M12 2.276a17.15 17.15 0 0 1 2.805 7.121a11.3 11.3 0 0 1-5.61 0A17.15 17.15 0 0 1 12 2.276m-1.878.154a18.6 18.6 0 0 0-2.37 6.49a11.3 11.3 0 0 1-3.746-2.504a9.75 9.75 0 0 1 6.116-3.985"/></svg>`;

	interface Props {
		domain?: string;
		src?: string;
		alt: string;
		class?: string;
		size?: number;
		loading?: 'lazy' | 'eager';
		fallbackUrls?: string[];
		preferIconify?: boolean; // When true, prioritize iconify icons over image URLs
		addBackground?: boolean; // Request background behind icons
		backgroundMode?: 'always' | 'transparent-only'; // When addBackground, choose whether to always show or only for transparent icons
	}

	let { 
		domain, 
		src, 
		alt, 
		class: className = '', 
		size = 32,
		loading = 'lazy',
		fallbackUrls = [],
		preferIconify = false,
		addBackground = false,
		backgroundMode = 'always'
	}: Props = $props();


	// State for image URLs and iconify
	let imageUrls = $state<string[]>([]);
	let currentIndex = $state(0);
	let hasError = $state(false);
	let imgElement = $state<HTMLImageElement | undefined>();
	let iconifyIcon = $state<string | null>(null);
	let useIconify = $state(false);
	let imageLoaded = $state(false);
	let isLoading = $state(true); // Track loading state
    let hasTransparency = $state<boolean>(false); // Default to opaque until proven transparent
    let showLoadingIndicator = $state(false); // Delay globe to avoid flash
	
	// Track last loaded props to prevent unnecessary reloads
	let lastLoadedDomain = $state<string | undefined>(undefined);
	let lastLoadedSrc = $state<string | undefined>(undefined);
	let lastPreferIconify = $state<boolean>(false);
	
	// Create a unique ID for this component instance to prevent cross-contamination
	const componentId = Math.random().toString(36).substring(7);
	
	// Debug logging for SmartImage (controlled by debug flags)
	$effect(() => {
		if (!domain) return;
		const shouldPreferIconify = preferIconify || experimental.preferIconifyIcons;
		debugInfo('SMART_IMAGE', `Debug for ${domain}:`, {
			preferIconify,
			experimentalPreferIconify: experimental.preferIconifyIcons,
			shouldPreferIconify,
			addBackground,
			backgroundMode,
			instantCacheCheck,
			useIconify,
			iconifyIcon,
			imageLoaded,
			isLoading,
			imageUrls: imageUrls.length,
			currentIndex
		});
	});
	
	// Instant cache check on component creation
	const instantCacheCheck = $derived.by(() => {
		if (!domain || src) return null;
		const shouldPreferIconify = preferIconify || experimental.preferIconifyIcons;

		// Check iconify cache first if preferred
		if (shouldPreferIconify) {
			const cachedIconName = getIconifyIconSync(domain);
			if (cachedIconName) {
				return { type: 'iconify', value: cachedIconName };
			}
		}

		// Check favicon cache
		const cachedUrls = getFaviconUrlsSync(domain, size);
		if (cachedUrls && cachedUrls.length > 0) {
			return { type: 'favicon', list: cachedUrls };
		}
		return null;
	});

	// Seed imageUrls immediately if we have cached favicons so normal logic handles fallback
	$effect(() => {
		if (!src && instantCacheCheck && instantCacheCheck.type === 'favicon' && imageUrls.length === 0) {
			imageUrls = instantCacheCheck.list;
			currentIndex = 0;
			useIconify = false;
			iconifyIcon = null;
		}
		
		// Don't show loading state if we have instant cache available
		if (instantCacheCheck) {
			isLoading = false;
		}

		// Start a small delay before showing globe to prevent flash of globe
		if (!instantCacheCheck && isLoading) {
			setTimeout(() => {
				if (isLoading && !imageLoaded && !useIconify) {
					showLoadingIndicator = true;
				}
			}, 120);
		}
	});

	// Update URLs when props change
	$effect(() => {
		// Check if we need to reload based on prop changes
		const shouldPreferIconify = preferIconify || experimental.preferIconifyIcons;
		const needsReload = 
			domain !== lastLoadedDomain || 
			src !== lastLoadedSrc || 
			shouldPreferIconify !== lastPreferIconify;
			
		if (!needsReload) return;
		
		// Reset state when changing domains to prevent icon mixing
		imageLoaded = false;
		useIconify = false;
		iconifyIcon = null;
		hasError = false;
		currentIndex = 0;
		isLoading = true; // Start loading
		showLoadingIndicator = false; // Reset globe delay indicator
		
		// Update tracking variables
		lastLoadedDomain = domain;
		lastLoadedSrc = src;
		lastPreferIconify = shouldPreferIconify;
		
		// IMMEDIATE synchronous cache check - no async needed!
		if (domain && !src) {
			// Check iconify cache first if preferred
			if (shouldPreferIconify) {
				const cachedIconName = getIconifyIconSync(domain);
				if (cachedIconName) {
					iconifyIcon = cachedIconName;
					useIconify = true;
					isLoading = false; // Done loading
					showLoadingIndicator = false;
					return; // Exit immediately - no async loading needed!
				}
			}
			
			// Check favicon cache
			const cachedUrls = getFaviconUrlsSync(domain, size);
			if (cachedUrls && cachedUrls.length > 0) {
				imageUrls = cachedUrls;
				currentIndex = 0;
				hasError = false;
				// Keep isLoading = true until actual image loads
				showLoadingIndicator = false; // we have a URL to try; avoid globe if possible
				// If Iconify is preferred but not in sync cache, fetch it asynchronously
				if (shouldPreferIconify) {
					getIconifyIcon(domain)
						.then((iconName) => {
							if (iconName && !useIconify && domain === lastLoadedDomain) {
								iconifyIcon = iconName;
								useIconify = true;
								isLoading = false;
								showLoadingIndicator = false;
							}
						})
						.catch(() => {
							// ignore and continue showing cached favicons
						});
				}
				return; // Exit immediately - favicon cached; iconify fetch (if any) is in-flight
			}
		}
		
		// Only do async loading if not in cache
		async function loadUrls() {
			try {
				// Reset state for uncached items
				useIconify = false;
				iconifyIcon = null;
				
				if (src) {
					imageUrls = [src, ...fallbackUrls];
					showLoadingIndicator = false;
				} else if (domain) {
					// Cache miss - use centralized ordering from citationUtils
					const urls = await getFaviconUrls(domain, size);
					imageUrls = urls;
					showLoadingIndicator = false; // try image before showing globe
				} else if (fallbackUrls.length > 0) {
					imageUrls = fallbackUrls;
					showLoadingIndicator = false;
				}
				
				currentIndex = 0;
				hasError = false;
			} catch (error) {
				hasError = true;
			}
		}
		
		loadUrls();
	});

	function handleError() {
		if (currentIndex < imageUrls.length - 1) {
			currentIndex++;
		} else {
			// Try iconify as final fallback if not already using it
			const shouldPreferIconify = preferIconify || experimental.preferIconifyIcons;
			if (!useIconify && domain && !shouldPreferIconify) {
				getIconifyIcon(domain).then(iconName => {
					if (iconName) {
						iconifyIcon = iconName;
						useIconify = true;
						isLoading = false; // Done loading
					} else {
						// Use inline globe as final fallback
						iconifyIcon = 'inline-globe';
						useIconify = true;
						isLoading = false; // Done loading
					}
				}).catch(() => {
					// Use inline globe as final fallback
					iconifyIcon = 'inline-globe';
					useIconify = true;
					isLoading = false; // Done loading
				});
			} else if (!useIconify) {
				// Use inline globe as final fallback
				iconifyIcon = 'inline-globe';
				useIconify = true;
				isLoading = false; // Done loading
			}
		}
	}

    function isGoogleS2(url: string | undefined): boolean {
        if (!url) return false;
        return /https?:\/\/www\.google\.com\/s2\/favicons/i.test(url);
    }

    function isGoogleStaticFavicon(url: string | undefined): boolean {
        if (!url) return false;
        return /https?:\/\/.*\.gstatic\.com\/faviconV2/i.test(url);
    }

    function detectTransparency(img: HTMLImageElement): boolean {
		try {
			const canvas = document.createElement('canvas');
			const sample = Math.min(16, Math.max(8, Math.round(size)));
			canvas.width = sample;
			canvas.height = sample;
			const ctx = canvas.getContext('2d');
			if (!ctx) return true;
			ctx.clearRect(0, 0, sample, sample);
			ctx.drawImage(img, 0, 0, sample, sample);
			const data = ctx.getImageData(0, 0, sample, sample).data;
			for (let i = 3; i < data.length; i += 4) {
				if (data[i] < 250) { // allow slight antialiasing
					return true;
				}
			}
            return false;
        } catch {
            // On CORS-tainted canvas, treat as opaque per policy
            return false;
		}
	}

	function handleLoad() {
		hasError = false;
		imageLoaded = true;
		isLoading = false; // Done loading
		showLoadingIndicator = false;
        if (imgElement) {
			imgElement.style.display = 'block';
            // Transparency detection only for bitmap images
            if (backgroundMode === 'always') {
                hasTransparency = true;
            } else {
                const currentUrl = (imgElement as HTMLImageElement).currentSrc || imgElement.src;
                // Treat Google S2 and gstatic faviconV2 as transparent by default (apply bg)
                hasTransparency = (isGoogleS2(currentUrl) || isGoogleStaticFavicon(currentUrl)) ? true : detectTransparency(imgElement);
            }
		}
	}

	// Use a more controlled approach for image src updates
	$effect(() => {
		if (imgElement && imageUrls[currentIndex] && !useIconify) {
			// Only update if this is truly our image element
			if (imgElement.dataset.componentId === componentId) {
				imgElement.src = imageUrls[currentIndex];
			}
		}
	});
</script>

	<!-- Conditionally wrap with background -->
<!-- Debug: addBackground={addBackground} -->
{#if addBackground}
	{#key componentId}
		{#if instantCacheCheck && instantCacheCheck.type === 'iconify'}
			<!-- ICONIFY CACHED ICON (highest priority) -->
			<div class="{className} relative rounded-full overflow-hidden flex items-center justify-center">
				{#if backgroundMode === 'always' || backgroundMode === 'transparent-only'}
					<div aria-hidden="true" class="absolute inset-[1px] bg-white rounded-full z-0"></div>
				{/if}
				<Icon icon={instantCacheCheck.value} class="w-4/5 h-4/5 relative z-10" />
			</div>
		{:else if instantCacheCheck && instantCacheCheck.type === 'favicon' && !useIconify}
			<!-- FAVICON CACHED (show immediately without globe) -->
			<div class="{className} relative rounded-full overflow-hidden flex items-center justify-center">
				{#if backgroundMode === 'always' || isGoogleS2(instantCacheCheck.list[0]) || isGoogleStaticFavicon(instantCacheCheck.list[0]) || hasTransparency}
					<div aria-hidden="true" class="absolute inset-[1px] bg-white rounded-full z-0"></div>
				{/if}
				<img
					bind:this={imgElement}
					src={instantCacheCheck.list[currentIndex] || instantCacheCheck.list[0]}
					alt={alt}
					class="w-full h-full object-cover rounded-full relative z-10"
					{loading}
					decoding="async"
					fetchpriority={loading === 'eager' ? 'high' : 'low'}
					data-component-id={componentId}
					onerror={handleError}
					onload={handleLoad}
				/>
			</div>
		{:else if useIconify && iconifyIcon}
			<!-- ICONIFY LOADED ICON -->
			<div class="{className} relative rounded-full overflow-hidden flex items-center justify-center">
				{#if backgroundMode === 'always' || backgroundMode === 'transparent-only'}
					<div aria-hidden="true" class="absolute inset-[1px] bg-white rounded-full z-0"></div>
				{/if}
				{#if iconifyIcon === 'inline-globe'}
					<div class="w-4/5 h-4/5 opacity-50 flex items-center justify-center relative z-10">
						{@html GLOBE_SVG}
					</div>
				{:else}
					<Icon icon={iconifyIcon} class="w-4/5 h-4/5 relative z-10" />
				{/if}
			</div>
		{:else if imageLoaded && imgElement}
			<!-- IMAGE LOADED -->
			<div class="{className} relative rounded-full overflow-hidden flex items-center justify-center">
				{#if backgroundMode === 'always' || hasTransparency}
					<div aria-hidden="true" class="absolute inset-[1px] bg-white rounded-full z-0"></div>
				{/if}
				<img
					bind:this={imgElement}
					alt={alt}
					class="w-full h-full object-cover rounded-full relative z-10"
					{loading}
					data-component-id={componentId}
					onerror={handleError}
					onload={handleLoad}
				/>
			</div>
		{:else if imageUrls.length > 0 || isLoading}
			<!-- LOADING STATE - NO BACKGROUND UNTIL CONTENT LOADS -->
			<div class="{className} relative overflow-hidden">
				<!-- Hidden img element for loading -->
				<img
					bind:this={imgElement}
					alt={alt}
					class="w-full h-full rounded-full object-cover"
					{loading}
					decoding="async"
					fetchpriority={loading === 'eager' ? 'high' : 'low'}
					style="display: none;"
					data-component-id={componentId}
					onerror={handleError}
					onload={handleLoad}
				/>
				<!-- Blank placeholder to avoid globe flash -->
				<div class="w-full h-full"></div>
			</div>
		{:else}
			<!-- FINAL FALLBACK -->
			<div class="{className} relative rounded-full overflow-hidden flex items-center justify-center">
				<div aria-hidden="true" class="absolute inset-[1px] bg-white rounded-full z-0"></div>
				<!-- No globe to avoid flash -->
			</div>
		{/if}
	{/key}
{:else}
<!-- No background version -->
<div class="{className} relative">
	{#key componentId}
		{#if instantCacheCheck && instantCacheCheck.type === 'iconify'}
			<!-- ICONIFY CACHED ICON (highest priority) -->
			<Icon icon={instantCacheCheck.value} class="w-full h-full" />
		{:else if instantCacheCheck && instantCacheCheck.type === 'favicon' && !useIconify}
			<!-- FAVICON CACHED (show immediately without globe) -->
			<img
				bind:this={imgElement}
				src={instantCacheCheck.list[currentIndex] || instantCacheCheck.list[0]}
				alt={alt}
				class="w-full h-full rounded-full object-cover overflow-hidden"
				{loading}
				decoding="async"
				fetchpriority={loading === 'eager' ? 'high' : 'low'}
				data-component-id={componentId}
				onerror={handleError}
				onload={handleLoad}
			/>
		{:else if useIconify && iconifyIcon}
			<!-- ICONIFY LOADED ICON -->
			{#if iconifyIcon === 'inline-globe'}
				<div class="w-full h-full opacity-50 flex items-center justify-center">
					{@html GLOBE_SVG}
				</div>
			{:else}
				<Icon icon={iconifyIcon} class="w-full h-full" />
			{/if}
		{:else if imageLoaded && imgElement}
			<!-- IMAGE LOADED -->
			<img
				bind:this={imgElement}
				alt={alt}
				class="w-full h-full rounded-full object-cover"
				{loading}
				data-component-id={componentId}
				onerror={handleError}
				onload={handleLoad}
			/>
		{:else if imageUrls.length > 0 || isLoading}
			<!-- LOADING STATE -->
			<!-- Hidden img element for loading -->
			<img
				bind:this={imgElement}
				alt={alt}
				class="w-full h-full rounded-full object-cover"
				{loading}
				decoding="async"
				fetchpriority={loading === 'eager' ? 'high' : 'low'}
				style="display: none;"
				data-component-id={componentId}
				onerror={handleError}
				onload={handleLoad}
			/>
			<!-- Blank placeholder to avoid globe flash -->
			<div class="w-full h-full"></div>
		{:else}
			<!-- FINAL FALLBACK -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				class="w-full h-full opacity-0"
				aria-hidden="true"
				role="img"
			/>
		{/if}
	{/key}
</div>
{/if}

