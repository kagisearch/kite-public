import { prefetchFavicons } from '$lib/services/faviconService';
import { imagePreloadingService } from '$lib/services/imagePreloadingService';
import type { Story } from '$lib/types';
import { extractDomainFromUrl } from '$lib/utils/domainUtils';

/**
 * Hook for hover-based preloading. Prefetches the story's images and source
 * favicons in parallel so expanding the card shows them instantly instead of
 * loading one-by-one (KNEWS-253). Fires once per story.
 */
export function useHoverPreloading(story: Story, options: { priority?: boolean } = {}) {
	let isPreloaded = $state(false);
	let isHovered = $state(false);

	const handleMouseEnter = async () => {
		isHovered = true;
		if (isPreloaded) return;
		isPreloaded = true; // Set before await to dedupe rapid re-hovers.

		const domains = new Set<string>();
		if (Array.isArray(story.articles)) {
			for (const article of story.articles) {
				if (article?.link) {
					const domain = extractDomainFromUrl(article.link);
					if (domain) domains.add(domain);
				}
			}
		}

		await Promise.allSettled([
			imagePreloadingService.preloadStory(story, options),
			domains.size > 0
				? prefetchFavicons(Array.from(domains)).catch(() => undefined)
				: Promise.resolve(),
		]);
	};

	const handleMouseLeave = () => {
		isHovered = false;
	};

	return {
		get isPreloaded() {
			return isPreloaded;
		},
		get isHovered() {
			return isHovered;
		},
		handleMouseEnter,
		handleMouseLeave,
	};
}
