import { STORIES_PER_CATEGORY, buildCategoryList } from '$lib/constants/categories';
import type { Story } from '$lib/types';
import type { SeedData } from '$lib/types/seed';

/**
 * Fetch the full SSR seed payload (latest or specific batch + all categories
 * + stories + chaos index) for any route that renders the news shell.
 *
 * Used by both:
 *   - server-side `+page.server.ts` loaders (via SvelteKit's special `fetch`,
 *     which short-circuits to direct handler invocation)
 *   - client-side `DataLoader` time-travel/language reloads (via `globalThis.fetch`)
 *
 * Returns null on failure or for non-existent batches.
 */
export async function fetchSeed(
	fetch: typeof globalThis.fetch,
	opts: {
		batchId?: string;
		lang?: string;
		/** Current category string id (e.g. "world"). Only this category's
		 *  stories are fetched; others lazy-load on tab switch. */
		currentCategory?: string;
		/** Existing categoryId→UUID map so we can resolve the UUID for
		 *  currentCategory without waiting for the categories response. */
		categoryMap?: Record<string, string>;
	} = {},
): Promise<SeedData | null> {
	const lang = opts.lang || 'default';

	try {
		const batchUrl = opts.batchId
			? `/api/batches/${encodeURIComponent(opts.batchId)}`
			: `/api/batches/latest?lang=${lang}`;
		const batchRes = await fetch(batchUrl);
		if (!batchRes.ok) return null;

		const batch = (await batchRes.json()) as {
			id: string;
			createdAt: string;
			dateSlug?: string;
			totalReadCount?: number;
		};

		// Categories and chaos index only need the batch id — fire in parallel.
		const categoriesPromise = fetch(`/api/batches/${batch.id}/categories?lang=${lang}`);
		const chaosPromise = fetch(`/api/batches/${batch.id}/chaos?lang=${lang}`)
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null);

		const categoriesRes = await categoriesPromise;
		if (!categoriesRes.ok) return null;
		const categoriesData = (await categoriesRes.json()) as {
			hasOnThisDay?: boolean;
			categories: Array<{ id: string; categoryId: string; categoryName: string }>;
		};

		const { categories, categoryMap } = buildCategoryList(
			categoriesData.categories || [],
			categoriesData.hasOnThisDay || false,
		);

		// Only fetch stories for the current category. Other categories
		// lazy-load via loadStoriesForCategory on tab switch (~300ms).
		// This cuts time-travel reload from ~20 parallel requests to 1.
		const targetCategoryId = opts.currentCategory;
		const targetUuid = targetCategoryId
			? opts.categoryMap?.[targetCategoryId] || categoryMap[targetCategoryId]
			: undefined;

		const allCategoryStories: Record<string, Story[]> = {};
		let totalReadCountSum = 0;

		if (targetUuid) {
			try {
				const r = await fetch(
					`/api/batches/${batch.id}/categories/${targetUuid}/stories?limit=${STORIES_PER_CATEGORY}&lang=${lang}`,
				);
				if (r.ok) {
					const json = (await r.json()) as { stories: Story[]; readCount?: number };
					allCategoryStories[targetCategoryId!] = json.stories || [];
					totalReadCountSum = json.readCount || 0;
				}
			} catch {
				// Fall through — category will lazy-load on demand.
			}
		}

		const chaosData = await chaosPromise;

		return {
			batchId: batch.id,
			dateSlug: batch.dateSlug,
			batchCreatedAt: batch.createdAt,
			categories,
			categoryMap,
			allCategoryStories,
			timestamp: new Date(batch.createdAt).getTime() / 1000,
			hasOnThisDay: categoriesData.hasOnThisDay || false,
			chaosIndex: chaosData?.chaosIndex,
			chaosDescription: chaosData?.chaosDescription,
			chaosLastUpdated: chaosData?.chaosLastUpdated,
			totalReadCount: batch.totalReadCount || totalReadCountSum,
			// isLatestBatch is a client-side concept. True only when no explicit
			// batchId was requested — historical routes always pass a batchId.
			isLatestBatch: !opts.batchId,
			// Reload paths (time travel, language change) want to preserve the
			// user's current category — handleDataLoaded falls through to
			// state.currentCategory when seed.preferredCategory is empty.
			preferredCategory: '',
			// Reload paths run client-side where localStorage is canonical;
			// no need to ship enabled in the seed.
		};
	} catch {
		return null;
	}
}
