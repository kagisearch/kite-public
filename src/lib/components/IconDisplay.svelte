<script lang="ts">
	import { iconService, type IconData } from '$lib/services/iconService';
	import { getIconName } from '$lib/utils/iconPreloader';

	// Props using Svelte 5 runes syntax
	interface Props {
		emoji?: string;
		className?: string;
		forceEmoji?: boolean; // when true, always render raw emoji, skip mapping
	}

	let { emoji, className = 'icon-lg', forceEmoji = false }: Props = $props();
	
	// Use forceEmoji to skip icon mapping when requested
	const shouldUseIcon = $derived(!forceEmoji && emoji);

	// State for the fetched icon data
	let iconData = $state<IconData | null>(null);
	let loadingState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');

	const iconName = $derived(shouldUseIcon ? getIconName(emoji || '') : null);

	// Map the provided className to the corresponding CSS variable so that
	// emoji fallbacks scale consistently with SVG icons and global font size
	const emojiSizeVar = $derived(() => {
		const cls = className || '';
		if (cls.includes('icon-xl')) return 'var(--icon-xl)';
		if (cls.includes('icon-lg')) return 'var(--icon-lg)';
		if (cls.includes('icon-base')) return 'var(--icon-base)';
		if (cls.includes('icon-sm')) return 'var(--icon-sm)';
		if (cls.includes('icon-xs')) return 'var(--icon-xs)';
		return 'var(--icon-lg)';
	});

	// Compensate for visual size differences between icon libraries
	// These mild scale factors keep cross-library icons visually consistent
	const visualScale = $derived(() => {
		if (!iconName) return 1;
		const prefix = iconName.split(':')[0];
		switch (prefix) {
			case 'tabler':
				return 1.12; // tabler icons have larger padding
			case 'heroicons-outline':
				return 1.08; // outlines look smaller at the same box
			case 'material-symbols':
				return 1.04; // slightly conservative bump
			default:
				return 1;
		}
	});

	// Immediately check for cached icon on iconName change
	$effect(() => {
		if (iconName) {
			const cached = iconService.getCachedIcon(iconName);
			if (cached) {
				iconData = cached;
				loadingState = 'success';
			}
		}
	});

	// Reactive effect to fetch icon data when the iconName changes
	$effect(() => {
		if (!iconName) {
			iconData = null;
			loadingState = 'idle';
			return;
		}

		// Check if already cached - get synchronously if available
		const cachedIcon = iconService.getCachedIcon(iconName);
		if (cachedIcon) {
			iconData = cachedIcon;
			loadingState = 'success';
			return;
		}

		// For uncached icons, show emoji immediately and load icon in background
		loadingState = 'loading';
		iconData = null;

		let isCancelled = false;

		// Start fetching the icon in background
		iconService.getIcon(iconName).then(data => {
			if (!isCancelled) {
				iconData = data;
				loadingState = data ? 'success' : 'error';
			}
		}).catch(error => {
			if (!isCancelled) {
				// Only log warnings for unexpected errors, not missing icons
				if (!(error instanceof Error) || !error.message.includes('not found')) {
					console.warn(`Failed to load icon: ${iconName}`, error);
				}
				iconData = null;
				loadingState = 'error';
			}
		});

		// Cleanup function to prevent state updates on unmounted components
		return () => {
			isCancelled = true;
		};
	});
</script>

{#if loadingState === 'success' && iconData}
	<!-- Render the icon as an inline SVG with a dynamic viewBox -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="{iconData.left} {iconData.top} {iconData.width} {iconData.height}"
		class={className}
		aria-hidden="true"
		role="img"
		fill="currentColor"
		style="transform: translateZ(0) scale({visualScale}); transform-origin: 50% 50%; overflow: visible; transform-box: fill-box;"
	>
		{@html iconData.body}
	</svg>
{:else if emoji}
	<!-- Show emoji immediately - no loading states, just emoji while icon loads -->
	<span
		class={className + ' inline-flex items-center justify-center text-center'}
		style="font-size: {emojiSizeVar}; line-height: 1;"
	>{emoji}</span>
{:else}
	<!-- Only show loading indicator if no emoji is available -->
	<!-- Reserve space to avoid layout shift while loading -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		class="{className} opacity-0"
		aria-hidden="true"
		role="img"
	/>
{/if}