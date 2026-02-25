/**
 * Favicon Service - Progressive enhancement with two tiers
 *
 * Strategy:
 * 1. Google's fast favicon (128px PNG) — displayed immediately
 * 2. Best available icon (scraped SVG/apple-touch-icon/large PNG/Favicone) — upgrades when ready
 *
 * Both requests fire in parallel. Google shows first, then upgrades to best when available.
 */

interface FaviconResult {
	url: string;
	quality: 'low' | 'best';
	source: 'google' | 'best' | 'placeholder';
}

type FaviconCallback = (result: FaviconResult) => void;

// Cache for favicon results
const faviconCache = new Map<string, FaviconResult>();

// Pending requests to avoid duplicate fetches
const pendingRequests = new Map<string, Promise<void>>();

// Callbacks waiting for favicon updates
const callbacks = new Map<string, Set<FaviconCallback>>();

function getGoogleFaviconUrl(domain: string): string {
	return `/api/favicon-proxy?domain=${encodeURIComponent(domain)}&quality=fast`;
}

function getBestFaviconUrl(domain: string): string {
	return `/api/favicon-proxy?domain=${encodeURIComponent(domain)}&quality=best`;
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

		try {
			img.src = url;
		} catch {
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
		// If we already have best quality, no need to upgrade
		if (cached.quality === 'best') {
			return cached;
		}
		// Otherwise, try to upgrade in background
		if (!pendingRequests.has(domain)) {
			upgradeInBackground(domain);
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
 * Fetch favicons from both sources in parallel with progressive enhancement.
 * Google loads fast for immediate display, best quality upgrades when ready.
 */
async function fetchParallel(domain: string): Promise<void> {
	const googleUrl = getGoogleFaviconUrl(domain);
	const bestUrl = getBestFaviconUrl(domain);

	const googlePromise = checkImageLoads(googleUrl, 3000).then((success) => ({
		success,
		url: googleUrl,
		quality: 'low' as const,
		source: 'google' as const,
	}));

	const bestPromise = checkImageLoads(bestUrl, 8000).then((success) => ({
		success,
		url: bestUrl,
		quality: 'best' as const,
		source: 'best' as const,
	}));

	const maybeUpdate = (candidate: {
		success: boolean;
		url: string;
		quality: FaviconResult['quality'];
		source: FaviconResult['source'];
	}) => {
		if (!candidate.success) return;
		const current = faviconCache.get(domain);
		// Accept if no cache yet, or upgrade from low → best (never downgrade)
		if (!current || (current.quality === 'low' && candidate.quality === 'best')) {
			const result: FaviconResult = {
				url: candidate.url,
				quality: candidate.quality,
				source: candidate.source,
			};
			faviconCache.set(domain, result);
			notifyCallbacks(domain, result);
		}
	};

	// Fire-and-forget: each source updates independently when ready
	googlePromise.then(maybeUpdate).catch(() => {});
	bestPromise.then(maybeUpdate).catch(() => {});

	try {
		// Wait for at least one to succeed, or all to fail
		await Promise.race([
			googlePromise.then((r) => (r.success ? r : new Promise<never>(() => {}))),
			bestPromise.then((r) => (r.success ? r : new Promise<never>(() => {}))),
			Promise.allSettled([googlePromise, bestPromise]).then(() => null),
		]);

		// Wait for both to settle so background upgrade completes
		await Promise.allSettled([googlePromise, bestPromise]);

		if (!faviconCache.has(domain)) {
			const placeholder = getPlaceholderResult();
			faviconCache.set(domain, placeholder);
			notifyCallbacks(domain, placeholder);
		}
	} catch {
		await Promise.allSettled([googlePromise, bestPromise]);

		if (!faviconCache.has(domain)) {
			const placeholder = getPlaceholderResult();
			faviconCache.set(domain, placeholder);
			notifyCallbacks(domain, placeholder);
		}
	}
}

/**
 * Try to upgrade a cached low-quality result in the background
 */
async function upgradeInBackground(domain: string): Promise<void> {
	const bestUrl = getBestFaviconUrl(domain);
	try {
		const success = await checkImageLoads(bestUrl, 8000);
		if (success) {
			const current = faviconCache.get(domain);
			if (!current || current.quality !== 'best') {
				const result: FaviconResult = { url: bestUrl, quality: 'best', source: 'best' };
				faviconCache.set(domain, result);
				notifyCallbacks(domain, result);
			}
		}
	} catch {
		// Silently fail for background updates
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
	const cached = faviconCache.get(domain);
	if (cached) {
		return cached.url;
	}
	return getGoogleFaviconUrl(domain);
}
