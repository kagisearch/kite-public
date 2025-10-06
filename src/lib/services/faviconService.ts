/**
 * Favicon Service - Parallel fetching with Google fallback
 *
 * This service fetches favicons from multiple sources in parallel:
 * 1. Google's fast favicon service (lower quality but fast)
 * 2. Favicone.com's high quality service (higher quality but slower)
 *
 * Strategy:
 * - Fire both requests in parallel
 * - Use Google's result immediately if it arrives first
 * - Update to high quality version when/if it arrives
 * - Cache results to avoid repeated fetches
 */

interface FaviconResult {
	url: string;
	quality: 'low' | 'high';
	source: 'google' | 'favicone' | 'placeholder';
}

type FaviconCallback = (result: FaviconResult) => void;

// Cache for favicon results
const faviconCache = new Map<string, FaviconResult>();

// Pending requests to avoid duplicate fetches
const pendingRequests = new Map<string, Promise<void>>();

// Callbacks waiting for favicon updates
const callbacks = new Map<string, Set<FaviconCallback>>();

// Known domains where favicone.com doesn't work (to avoid unnecessary 404s)
const problematicDomains = new Set([
	'rt.com',
	'firstpost.com',
	// Add more as discovered
]);

/**
 * Get Google favicon URL (fast, lower quality)
 * Uses our unified favicon proxy
 */
function getGoogleFaviconUrl(domain: string): string {
	return `/api/favicon-proxy?domain=${encodeURIComponent(domain)}&quality=fast`;
}

/**
 * Get Favicone.com favicon URL (slower, high quality)
 * Uses our unified favicon proxy
 */
function getFaviconeFaviconUrl(domain: string): string {
	return `/api/favicon-proxy?domain=${encodeURIComponent(domain)}&quality=high`;
}

/**
 * Check if an image URL loads successfully
 */
async function checkImageLoads(url: string, timeout = 5000): Promise<boolean> {
	return new Promise((resolve) => {
		const img = new Image();
		const timer = setTimeout(() => {
			img.src = '';
			resolve(false);
		}, timeout);

		img.onload = () => {
			clearTimeout(timer);
			resolve(true);
		};

		img.onerror = () => {
			clearTimeout(timer);
			resolve(false);
		};

		// Use a try-catch to prevent console errors for 404s
		try {
			img.src = url;
		} catch (_e) {
			clearTimeout(timer);
			resolve(false);
		}
	});
}

/**
 * Fetch favicon with parallel requests and progressive enhancement
 *
 * @param domain - The domain to fetch favicon for
 * @param callback - Optional callback for progressive updates
 * @returns Initial favicon result (may be updated via callback)
 */
export async function fetchFavicon(
	domain: string,
	callback?: FaviconCallback,
): Promise<FaviconResult> {
	// Return cached result if available
	const cached = faviconCache.get(domain);
	if (cached) {
		// If we have a high quality cached version, return it immediately
		if (cached.quality === 'high') {
			return cached;
		}
		// If we only have low quality, still try to get high quality in background
		if (!pendingRequests.has(domain)) {
			fetchHighQualityInBackground(domain);
		}
		return cached;
	}

	// Register callback if provided
	if (callback) {
		if (!callbacks.has(domain)) {
			callbacks.set(domain, new Set());
		}
		callbacks.get(domain)!.add(callback);
	}

	// Check if request is already pending
	if (pendingRequests.has(domain)) {
		await pendingRequests.get(domain);
		return faviconCache.get(domain) || getPlaceholderResult();
	}

	// Start new parallel fetch
	const fetchPromise = fetchParallel(domain);
	pendingRequests.set(domain, fetchPromise);

	try {
		await fetchPromise;
	} finally {
		pendingRequests.delete(domain);
	}

	return faviconCache.get(domain) || getPlaceholderResult();
}

/**
 * Fetch favicons from both sources in parallel
 */
async function fetchParallel(domain: string): Promise<void> {
	const googleUrl = getGoogleFaviconUrl(domain);
	const faviconeUrl = getFaviconeFaviconUrl(domain);

	// Start both requests in parallel
	const googlePromise = checkImageLoads(googleUrl, 3000).then((success) => ({
		success,
		url: googleUrl,
		quality: 'low' as const,
		source: 'google' as const,
	}));

	// Skip high-quality fetch for known problematic domains
	const skipHighQuality = problematicDomains.has(domain);

	const faviconePromise = skipHighQuality
		? Promise.resolve({
				success: false,
				url: faviconeUrl,
				quality: 'high' as const,
				source: 'favicone' as const,
			})
		: checkImageLoads(faviconeUrl, 5000).then((success) => ({
				success,
				url: faviconeUrl,
				quality: 'high' as const,
				source: 'favicone' as const,
			}));

	try {
		// Race to see which one succeeds first
		const firstSuccessfulResult = await Promise.race([
			googlePromise.then((r) => (r.success ? r : new Promise(() => {}))),
			faviconePromise.then((r) => (r.success ? r : new Promise(() => {}))),
		]);

		// We have at least one successful result
		if (
			firstSuccessfulResult &&
			typeof firstSuccessfulResult === 'object' &&
			'success' in firstSuccessfulResult
		) {
			const successResult = firstSuccessfulResult as {
				success: true;
				url: string;
				quality: 'low' | 'high';
				source: 'google' | 'favicone';
			};
			const result: FaviconResult = {
				url: successResult.url,
				quality: successResult.quality,
				source: successResult.source,
			};

			// Cache and notify with the first successful result
			faviconCache.set(domain, result);
			notifyCallbacks(domain, result);

			// If we got Favicone first, we're done - it's already high quality
			if (successResult.source === 'favicone') {
				return;
			}

			// If we got Google first, still wait for Favicone to potentially upgrade
			if (successResult.source === 'google') {
				faviconePromise
					.then((faviconeResult) => {
						if (faviconeResult.success) {
							const highQualityResult: FaviconResult = {
								url: faviconeResult.url,
								quality: 'high',
								source: 'favicone',
							};
							faviconCache.set(domain, highQualityResult);
							notifyCallbacks(domain, highQualityResult);
						}
					})
					.catch(() => {
						// Silently ignore - we already have Google favicon
					});
			}
		} else {
			// Neither succeeded immediately, wait for both to complete
			const results = await Promise.allSettled([googlePromise, faviconePromise]);

			// Prefer favicone if it succeeded
			const faviconeResult = results[1];
			if (faviconeResult.status === 'fulfilled' && faviconeResult.value.success) {
				const result: FaviconResult = {
					url: faviconeResult.value.url,
					quality: 'high',
					source: 'favicone',
				};
				faviconCache.set(domain, result);
				notifyCallbacks(domain, result);
				return;
			}

			// Otherwise use Google if it succeeded
			const googleResult = results[0];
			if (googleResult.status === 'fulfilled' && googleResult.value.success) {
				const result: FaviconResult = {
					url: googleResult.value.url,
					quality: 'low',
					source: 'google',
				};
				faviconCache.set(domain, result);
				notifyCallbacks(domain, result);
				return;
			}

			// Both failed, use placeholder
			const placeholder = getPlaceholderResult();
			faviconCache.set(domain, placeholder);
			notifyCallbacks(domain, placeholder);
		}
	} catch (_error) {
		// If anything goes wrong, fallback to checking both results
		const results = await Promise.allSettled([googlePromise, faviconePromise]);

		for (const result of results) {
			if (result.status === 'fulfilled' && result.value.success) {
				const faviconResult: FaviconResult = {
					url: result.value.url,
					quality: result.value.quality,
					source: result.value.source,
				};
				faviconCache.set(domain, faviconResult);
				notifyCallbacks(domain, faviconResult);
				return;
			}
		}

		// Everything failed, use placeholder
		const placeholder = getPlaceholderResult();
		faviconCache.set(domain, placeholder);
		notifyCallbacks(domain, placeholder);
	}
}

/**
 * Fetch high quality favicon in background (for cached low quality results)
 */
async function fetchHighQualityInBackground(domain: string): Promise<void> {
	const faviconeUrl = getFaviconeFaviconUrl(domain);

	try {
		const success = await checkImageLoads(faviconeUrl, 5000);
		if (success) {
			const result: FaviconResult = {
				url: faviconeUrl,
				quality: 'high',
				source: 'favicone',
			};
			faviconCache.set(domain, result);
			notifyCallbacks(domain, result);
		}
	} catch (_error) {
		// Silently fail for background updates
		console.debug(`Background high quality favicon fetch failed for ${domain}`);
	}
}

/**
 * Notify all callbacks for a domain
 */
function notifyCallbacks(domain: string, result: FaviconResult): void {
	const domainCallbacks = callbacks.get(domain);
	if (domainCallbacks) {
		domainCallbacks.forEach((callback) => {
			try {
				callback(result);
			} catch (error) {
				console.error('Error in favicon callback:', error);
			}
		});
	}
}

/**
 * Get placeholder favicon result
 */
function getPlaceholderResult(): FaviconResult {
	return {
		url: '/svg/placeholder.svg',
		quality: 'low',
		source: 'placeholder',
	};
}

/**
 * Clear favicon cache (useful for testing or memory management)
 */
export function clearFaviconCache(): void {
	faviconCache.clear();
	callbacks.clear();
}

/**
 * Prefetch favicons for multiple domains
 */
export async function prefetchFavicons(domains: string[]): Promise<void> {
	const promises = domains.map((domain) =>
		fetchFavicon(domain).catch(() => {
			// Silently fail for prefetch
		}),
	);
	await Promise.allSettled(promises);
}

/**
 * Get simple favicon URL without fetching (for initial render)
 * Returns proxied Google's URL for immediate use
 */
export function getImmediateFaviconUrl(domain: string): string {
	// Check cache first
	const cached = faviconCache.get(domain);
	if (cached) {
		return cached.url;
	}

	// Return proxied Google URL for immediate display
	return getGoogleFaviconUrl(domain);
}
