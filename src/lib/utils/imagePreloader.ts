import { browser } from '$app/environment';
import type { Story } from '$lib/types';

// Cache to store image data URLs (original URL -> data URL)
const imageDataCache = new Map<string, string>();
const downloadPromises = new Map<string, Promise<string>>();

// Track active fetch controllers for cancellation
const activeControllers = new Map<string, AbortController>();

// Simple reactivity - list of callbacks to notify when cache updates
const cacheUpdateCallbacks = new Set<() => void>();

/**
 * Subscribe to cache updates
 */
export function onCacheUpdate(callback: () => void): () => void {
	cacheUpdateCallbacks.add(callback);
	return () => cacheUpdateCallbacks.delete(callback);
}

/**
 * Notify all subscribers that cache has been updated
 */
function notifyCacheUpdate() {
	cacheUpdateCallbacks.forEach((callback) => {
		try {
			callback();
		} catch (error) {
			console.warn('Error in cache update callback:', error);
		}
	});
}

/**
 * Download an image and convert it to a data URL
 */
async function downloadImageAsDataURL(src: string): Promise<string> {
	if (!browser || !src) throw new Error('Cannot download image');

	// Return existing promise if already downloading
	if (downloadPromises.has(src)) {
		return downloadPromises.get(src)!;
	}

	// Return cached data URL if already downloaded
	if (imageDataCache.has(src)) {
		return imageDataCache.get(src)!;
	}

	const controller = new AbortController();
	activeControllers.set(src, controller);

	const promise = new Promise<string>((resolve, reject) => {
		(async () => {
			try {
				let fetchUrl = src;

				// Use our proxy for kagiproxy.com URLs to avoid CORS issues
				if (src.startsWith('https://kagiproxy.com/')) {
					fetchUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
				}

				// Fetch the image with abort signal
				const response = await fetch(fetchUrl, { signal: controller.signal });
				if (!response.ok) {
					throw new Error(`Failed to fetch image: ${response.status}`);
				}

				// Convert to blob
				const blob = await response.blob();

				// Convert blob to data URL
				const reader = new FileReader();
				reader.onload = () => {
					const dataUrl = reader.result as string;
					imageDataCache.set(src, dataUrl);
					downloadPromises.delete(src);
					activeControllers.delete(src);
					notifyCacheUpdate(); // Notify subscribers
					resolve(dataUrl);
				};
				reader.onerror = () => {
					downloadPromises.delete(src);
					activeControllers.delete(src);
					reject(new Error(`Failed to convert image to data URL: ${src}`));
				};
				reader.readAsDataURL(blob);
			} catch (error) {
				downloadPromises.delete(src);
				activeControllers.delete(src);
				if (error instanceof Error && error.name === 'AbortError') {
					reject(new Error(`Image download cancelled: ${src}`));
				} else {
					reject(error);
				}
			}
		})();
	});

	downloadPromises.set(src, promise);
	return promise;
}

/**
 * Get the proper URL for an image, using proxy for kagiproxy URLs
 */
export function getProxiedImageUrl(originalUrl: string): string {
	if (!originalUrl) return originalUrl;

	// Always use proxy for kagiproxy URLs
	if (originalUrl.startsWith('https://kagiproxy.com/')) {
		return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
	}

	return originalUrl;
}

/**
 * Get image src - returns cached data URL if available, otherwise proxied URL
 */
export function getImageSrc(originalSrc: string): string {
	if (!browser || !originalSrc) return originalSrc;

	const cachedDataUrl = imageDataCache.get(originalSrc);
	if (cachedDataUrl) {
		return cachedDataUrl;
	}

	// Return proxied URL for kagiproxy, original for others
	return getProxiedImageUrl(originalSrc);
}

/**
 * Check if an image is cached
 */
export function isImageCached(src: string): boolean {
	return imageDataCache.has(src);
}

/**
 * Preload (download and cache) a single image
 */
export function preloadImage(src: string): Promise<void> {
	if (!browser || !src) return Promise.resolve();

	return downloadImageAsDataURL(src)
		.then(() => {
			// Image is now cached, nothing else to do
		})
		.catch((error) => {
			console.warn('Failed to preload image:', src, error);
			// Don't throw - allow graceful degradation
		});
}

/**
 * Check if device is mobile to disable preloading on mobile devices
 */
function isMobileDevice(): boolean {
	if (!browser) return false;

	// Check for mobile user agent
	const userAgent = navigator.userAgent.toLowerCase();
	const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
		userAgent,
	);

	// Check for small screen size
	const isSmallScreen = window.innerWidth <= 768;

	// Check for touch device
	const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	return isMobileUA || (isSmallScreen && isTouchDevice);
}

/**
 * Preload multiple images - disabled on mobile devices to save data
 */
export function preloadImages(imageUrls: string[], _priority = false): Promise<undefined[]> {
	if (!browser) return Promise.resolve([]);

	// Skip preloading on mobile devices to save data
	if (isMobileDevice()) {
		console.log('📱 Skipping image preloading on mobile device to save data');
		return Promise.resolve([]);
	}

	const validUrls = imageUrls.filter((url) => url?.trim()).map((url) => url.trim());

	if (validUrls.length === 0) {
		return Promise.resolve([]);
	}

	// Remove throttling - load all images simultaneously for better performance
	// The browser will handle the connection limiting automatically
	const promises = validUrls.map((url) => preloadImage(url));
	return Promise.all(promises);
}

/**
 * Extract image URLs from a story object
 */
export function extractStoryImages(story: Story): string[] {
	if (!story) return [];

	const images: string[] = [];

	// First priority: Extract primary and secondary images if they exist
	if (story.primary_image?.url) {
		images.push(story.primary_image.url);
	}
	if (story.secondary_image?.url) {
		images.push(story.secondary_image.url);
	}

	// If we have primary/secondary images, only use those for preloading
	// Otherwise fall back to extracting from articles
	if (images.length === 0 && story.articles && Array.isArray(story.articles)) {
		// Only take first two article images as fallback (matching the old behavior)
		const articleImages = story.articles
			.slice(0, 2)
			.map((article) => article.image)
			.filter((img) => img && typeof img === 'string');
		images.push(...articleImages);
	}

	return images.filter(Boolean);
}

/**
 * Clear image cache (call when changing categories)
 */
export function clearImageCache(): void {
	imageDataCache.clear();
	downloadPromises.clear();
	activeControllers.clear();
	notifyCacheUpdate();
}

/**
 * Cancel all active image downloads
 */
export function cancelAllDownloads() {
	const count = activeControllers.size;
	activeControllers.forEach((controller, _src) => {
		controller.abort();
	});
	activeControllers.clear();
	downloadPromises.clear();
	if (count > 0) {
		console.log(`❌ Cancelled ${count} active downloads`);
	}
}

/**
 * Get cache statistics
 */
export function getImageCacheStats(): {
	cachedCount: number;
	downloadingCount: number;
	cachedImages: string[];
} {
	return {
		cachedCount: imageDataCache.size,
		downloadingCount: downloadPromises.size,
		cachedImages: Array.from(imageDataCache.keys()),
	};
}

/**
 * Debug helper - expose cache functions to global scope for testing
 */
if (browser && typeof window !== 'undefined') {
	window.imageCache = {
		stats: getImageCacheStats,
		clear: clearImageCache,
		preload: preloadImage,
		getSrc: getImageSrc,
		getProxiedUrl: getProxiedImageUrl, // Add this for testing
		isCached: isImageCached,
		// Test function to verify cache is working
		test: async (imageUrl: string) => {
			console.log('Testing image cache with:', imageUrl);
			const startTime = performance.now();

			console.log('1. Original URL:', imageUrl);
			console.log('2. Proxied URL:', getProxiedImageUrl(imageUrl));
			console.log('3. Checking if already cached:', isImageCached(imageUrl));
			console.log('4. Current cache stats:', getImageCacheStats());

			console.log('5. Preloading image...');
			await preloadImage(imageUrl);

			const afterPreload = performance.now();
			console.log('6. Preload completed in', (afterPreload - startTime).toFixed(2), 'ms');
			console.log('7. Now cached:', isImageCached(imageUrl));
			console.log('8. Cache stats after preload:', getImageCacheStats());

			// Test getting the cached source
			const cachedSrc = getImageSrc(imageUrl);
			console.log(
				'9. Getting cached source:',
				cachedSrc.startsWith('data:') ? 'Data URL (cached)' : 'Proxied URL',
			);

			return {
				cached: isImageCached(imageUrl),
				dataUrl: cachedSrc.startsWith('data:'),
				loadTime: afterPreload - startTime,
			};
		},
		// Test bulk preloading
		testBulk: async (imageUrls: string[]) => {
			console.log('Testing bulk preloading with', imageUrls.length, 'images');
			const startTime = performance.now();

			const beforeStats = getImageCacheStats();
			console.log('Before:', beforeStats);

			await preloadImages(imageUrls, false);

			const afterTime = performance.now();
			const afterStats = getImageCacheStats();
			console.log('After:', afterStats);
			console.log('Time taken:', (afterTime - startTime).toFixed(2), 'ms');

			return {
				imageCount: imageUrls.length,
				loadTime: afterTime - startTime,
				beforeCached: beforeStats.cachedCount,
				afterCached: afterStats.cachedCount,
			};
		},
	};
}

// Legacy aliases for backward compatibility
export const isImagePreloaded = isImageCached;
export const clearPreloadCache = clearImageCache;
