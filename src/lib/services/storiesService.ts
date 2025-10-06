import { prefetchFavicons } from '$lib/services/faviconService';
import type { Story } from '$lib/types';
import { extractDomainFromUrl } from '$lib/utils/domainUtils';

/**
 * Service for loading story data
 */
class StoriesService {
	private baseUrl = '/api';

	/**
	 * Load stories for a specific category from a batch
	 */
	async loadStories(
		batchId: string,
		categoryUuid: string,
		limit: number = 12, // Max 12 stories per category from UI
		language: string = 'default',
	): Promise<{ stories: Story[]; readCount: number; timestamp: number }> {
		try {
			// Load stories for this category with language parameter
			const response = await fetch(
				`${this.baseUrl}/batches/${batchId}/categories/${categoryUuid}/stories?limit=${limit}&lang=${language}`,
			);
			if (!response.ok) {
				throw new Error(`Failed to load stories: ${response.statusText}`);
			}
			const data = await response.json();

			// Prefetch favicons for all story sources in the background
			this.prefetchStoryFavicons(data.stories);

			return {
				stories: data.stories,
				readCount: data.readCount,
				timestamp: data.timestamp,
			};
		} catch (error) {
			console.error('Error loading stories:', error);
			throw error;
		}
	}

	/**
	 * Prefetch favicons for all sources in stories
	 * Runs in background without blocking the main flow
	 */
	private prefetchStoryFavicons(stories: Story[]) {
		try {
			// Extract unique domains from all story sources
			const domains = new Set<string>();

			for (const story of stories) {
				// Extract domains from articles instead of sources
				if (story.articles && Array.isArray(story.articles)) {
					for (const article of story.articles) {
						if (article.link) {
							const domain = extractDomainFromUrl(article.link);
							if (domain) {
								domains.add(domain);
							}
						}
					}
				}
			}

			// Prefetch favicons in the background
			if (domains.size > 0) {
				const domainArray = Array.from(domains);
				console.debug(`Prefetching favicons for ${domainArray.length} domains`);
				prefetchFavicons(domainArray).catch((error) => {
					console.debug('Favicon prefetch failed:', error);
				});
			}
		} catch (error) {
			// Don't let prefetch errors affect the main flow
			console.debug('Error during favicon prefetch:', error);
		}
	}
}

// Export singleton instance
export const storiesService = new StoriesService();
