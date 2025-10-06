import { browser } from '$app/environment';
import type { Story } from '$lib/types';
import { isMobileDevice } from '$lib/utils/device';
import {
	preloadImages as basePreloadImages,
	cancelAllDownloads,
	clearImageCache,
	extractStoryImages,
	getImageCacheStats,
	isImageCached,
	preloadImage,
} from '$lib/utils/imagePreloader';
import { dataService } from './dataService';

/**
 * Configuration for preloading behavior
 */
interface PreloadConfig {
	enabledInTimeTravelMode: boolean;
	enabledOnMobile: boolean;
	categoryPreloadDelay: number;
	storyPreloadDelay: number;
	viewportMargin: string;
	logLevel: 'none' | 'errors' | 'info' | 'verbose';
	preloadTimeout: number; // Timeout in milliseconds for desktop preloading
}

/**
 * Default configuration
 */
const defaultConfig: PreloadConfig = {
	enabledInTimeTravelMode: false,
	enabledOnMobile: false,
	categoryPreloadDelay: 500,
	storyPreloadDelay: 0,
	viewportMargin: '100px',
	logLevel: 'info',
	preloadTimeout: 2000, // 2 seconds timeout for desktop
};

/**
 * Centralized image preloading service
 */
class ImagePreloadingService {
	private config: PreloadConfig = { ...defaultConfig };
	private preloadingInProgress = new Set<string>();

	/**
	 * Configure the preloading service
	 */
	configure(config: Partial<PreloadConfig>) {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Check if preloading is allowed based on current conditions
	 */
	private canPreload(): boolean {
		if (!browser) return false;

		// Check time travel mode
		if (!this.config.enabledInTimeTravelMode && dataService.isTimeTravelMode()) {
			this.log('info', '⏳ Skipping preload: Time travel mode is active');
			return false;
		}

		// Check mobile device
		if (!this.config.enabledOnMobile && isMobileDevice()) {
			this.log('info', '📱 Skipping preload: Mobile device detected');
			return false;
		}

		return true;
	}

	/**
	 * Preload images for an entire category of stories
	 */
	async preloadCategory(stories: Story[], options?: { priority?: boolean }): Promise<void> {
		if (!this.canPreload()) return;

		const categoryKey = `category-${stories[0]?.category || 'unknown'}`;
		if (this.preloadingInProgress.has(categoryKey)) {
			this.log('verbose', `⏭️  Category already being preloaded: ${categoryKey}`);
			return;
		}

		this.preloadingInProgress.add(categoryKey);

		try {
			// Extract all unique image URLs from stories
			const allUrls = stories.flatMap((story) => extractStoryImages(story));
			const uniqueUrls = [...new Set(allUrls)];

			// Filter out already cached images
			const uncachedUrls = uniqueUrls.filter((url) => !isImageCached(url));

			if (uncachedUrls.length === 0) {
				this.log('info', `✅ All ${uniqueUrls.length} images already cached for category`);
				return;
			}

			this.log(
				'info',
				`🖼️  Preloading ${uncachedUrls.length} images for category (${uniqueUrls.length - uncachedUrls.length} already cached)`,
			);

			// Add delay if configured
			if (this.config.categoryPreloadDelay > 0) {
				await new Promise((resolve) => setTimeout(resolve, this.config.categoryPreloadDelay));
			}

			// Preload images with timeout on desktop
			const startTime = performance.now();

			// Only apply timeout on desktop (not mobile)
			if (!isMobileDevice() && this.config.preloadTimeout > 0) {
				// Create a timeout promise
				const timeoutPromise = new Promise<void>((_, reject) => {
					setTimeout(() => {
						reject(new Error('Preload timeout'));
					}, this.config.preloadTimeout);
				});

				try {
					// Race between preloading and timeout
					await Promise.race([
						basePreloadImages(uncachedUrls, options?.priority || false),
						timeoutPromise,
					]);

					const duration = performance.now() - startTime;
					this.log(
						'info',
						`✅ Preloaded ${uncachedUrls.length} images in ${duration.toFixed(2)}ms`,
					);
				} catch (error) {
					const duration = performance.now() - startTime;
					if (error instanceof Error && error.message === 'Preload timeout') {
						// Cancel all ongoing downloads
						cancelAllDownloads();
						this.log(
							'info',
							`⏱️ Preload timeout after ${duration.toFixed(2)}ms - cancelled remaining downloads. Images will load on demand.`,
						);
					} else {
						throw error;
					}
				}
			} else {
				// No timeout on mobile or if timeout is disabled
				await basePreloadImages(uncachedUrls, options?.priority || false);
				const duration = performance.now() - startTime;
				this.log('info', `✅ Preloaded ${uncachedUrls.length} images in ${duration.toFixed(2)}ms`);
			}
		} catch (error) {
			this.log('errors', `❌ Category preload failed: ${error}`);
		} finally {
			this.preloadingInProgress.delete(categoryKey);
		}
	}

	/**
	 * Preload images for a single story
	 */
	async preloadStory(story: Story, options?: { priority?: boolean }): Promise<void> {
		if (!this.canPreload()) return;

		const storyKey = `story-${story.cluster_number}`;
		if (this.preloadingInProgress.has(storyKey)) {
			this.log('verbose', `⏭️  Story already being preloaded: ${storyKey}`);
			return;
		}

		this.preloadingInProgress.add(storyKey);

		try {
			const imageUrls = extractStoryImages(story);
			const uncachedUrls = imageUrls.filter((url) => !isImageCached(url));

			if (uncachedUrls.length === 0) {
				this.log('verbose', `✅ All images cached for story ${story.cluster_number}`);
				return;
			}

			this.log('verbose', `🖼️  Preloading ${uncachedUrls.length} images for story`);

			// Add delay if configured
			if (this.config.storyPreloadDelay > 0) {
				await new Promise((resolve) => setTimeout(resolve, this.config.storyPreloadDelay));
			}

			await basePreloadImages(uncachedUrls, options?.priority || false);
		} catch (error) {
			this.log('errors', `❌ Story preload failed: ${error}`);
		} finally {
			this.preloadingInProgress.delete(storyKey);
		}
	}

	/**
	 * Preload a single image URL
	 */
	async preloadSingleImage(url: string): Promise<void> {
		if (!this.canPreload()) return;
		if (isImageCached(url)) return;

		try {
			await preloadImage(url);
			this.log('verbose', `✅ Preloaded single image: ${url.substring(0, 50)}...`);
		} catch (error) {
			this.log('errors', `❌ Single image preload failed: ${error}`);
		}
	}

	/**
	 * Create an intersection observer for viewport-based preloading
	 */
	createViewportPreloader(
		onIntersect: (entry: IntersectionObserverEntry) => void,
	): IntersectionObserver | null {
		if (!browser) return null;

		return new IntersectionObserver(
			(entries) => {
				if (!this.canPreload()) return;

				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						onIntersect(entry);
					}
				});
			},
			{
				rootMargin: this.config.viewportMargin,
				threshold: 0.1,
			},
		);
	}

	/**
	 * Logging utility
	 */
	private log(level: PreloadConfig['logLevel'], message: string) {
		if (this.config.logLevel === 'none') return;

		const levels: PreloadConfig['logLevel'][] = ['errors', 'info', 'verbose'];
		const currentLevelIndex = levels.indexOf(this.config.logLevel);
		const messageLevelIndex = levels.indexOf(level);

		if (messageLevelIndex <= currentLevelIndex) {
			if (level === 'errors') {
				console.error(message);
			} else {
				console.log(message);
			}
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): Readonly<PreloadConfig> {
		return { ...this.config };
	}

	/**
	 * Check if currently preloading
	 */
	isPreloading(): boolean {
		return this.preloadingInProgress.size > 0;
	}

	/**
	 * Clear all ongoing preloads
	 */
	clearPreloading() {
		this.preloadingInProgress.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return getImageCacheStats();
	}

	/**
	 * Clear the image cache
	 */
	clearCache() {
		clearImageCache();
		// Also clear our internal tracking
		this.preloadingInProgress.clear();
	}
}

// Export singleton instance
export const imagePreloadingService = new ImagePreloadingService();

// Export types
export type { PreloadConfig };
