/**
 * Hook to prefetch favicons for better performance
 *
 * Use this to prefetch favicons when you know which domains
 * will be displayed soon (e.g., when loading story data)
 */

import { onMount } from 'svelte';
import { prefetchFavicons } from '$lib/services/faviconService';

/**
 * Prefetch favicons for a list of domains
 *
 * @param getDomains - Function that returns domains to prefetch
 */
export function useFaviconPrefetch(getDomains: () => string[] | undefined) {
	onMount(() => {
		const domains = getDomains();
		if (domains && domains.length > 0) {
			// Prefetch in the background
			prefetchFavicons(domains).catch((error) => {
				console.debug('Favicon prefetch failed:', error);
			});
		}
	});
}
