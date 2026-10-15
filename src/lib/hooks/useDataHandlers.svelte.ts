import { browser } from '$app/environment';
import { isOnThisDay, STORIES_PER_CATEGORY } from '$lib/constants/categories';
import {
	categorySettings,
	displaySettings,
	languageSettings,
	sectionSettings,
} from '$lib/data/settings.svelte';
import { dataService } from '$lib/services/dataService';
import type { NavigationParams } from '$lib/services/urlNavigationService';
import { categoryMetadataStore } from '$lib/stores/categoryMetadata.svelte';
import { contentFilter } from '$lib/stores/contentFilter.svelte';
import { experimental } from '$lib/stores/experimental.svelte';
import { timeTravel } from '$lib/stores/timeTravel.svelte';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import type { Category, OnThisDayEvent, Story } from '$lib/types';
import type { HistoryManagerInstance } from '$lib/types/components';
import type { SeedData } from '$lib/types/seed';
import { formatTimeAgo } from '$lib/utils/formatTimeAgo';

interface DataHandlersState {
	categories: Category[];
	stories: Story[];
	totalReadCount: number;
	lastUpdated: string;
	lastUpdatedTimestamp: number;
	currentCategory: string;
	allCategoryStories: Record<string, Story[]>;
	loadingCategories: Record<string, true>;
	categoryMap: Record<string, string>;
	currentBatchId: string;
	currentDateSlug: string | undefined;
	currentBatchCreatedAt: string;
	lastLoadedCategory: string;
	isLatestBatch: boolean;
	chaosIndex: { score: number; summary: string; lastUpdated: string };
	temporaryCategory: string | null;
	showTemporaryCategoryTooltip: boolean;
	dataLoaded: boolean;
	isLoadingCategory: boolean;
	onThisDayEvents: OnThisDayEvent[];
	onThisDayLanguage: string;
	expandedStories: Record<string, boolean>;
	initiallyExpandedStoryIndex: number | null;
	storyCountOverride: number | null;
	readStories: Record<string, boolean>;
}

/**
 * Single entry point for "I have a fresh batch payload, apply it to state".
 * Used by both initial SSR hydration and subsequent reloads (time travel,
 * language change). Server-safe: state writes happen unconditionally; the
 * browser-only side effects (categorySettings init, OnThisDay load, story-
 * from-URL expansion) are gated on `browser`.
 */
export function useDataHandlers(
	state: DataHandlersState,
	helpers: {
		updatePageTitle: (categoryId: string) => void;
		closeSourceOverlay: () => void;
		closeWikipediaPopup: () => void;
		historyManager: HistoryManagerInstance | undefined;
		parseInitialUrl: () => NavigationParams;
		s: (key: string) => string;
	},
) {
	function handleDataLoaded(seed: SeedData, opts: { initialMount?: boolean } = {}) {
		// Reload semantics: clear stale per-batch state. On the very first
		// (initial-mount) call this is a no-op since these fields start empty.
		state.isLoadingCategory = false;
		state.expandedStories = {};
		state.lastLoadedCategory = '';
		state.onThisDayEvents = [];
		batchGeneration++;
		inFlightCategoryFetches.clear();
		state.loadingCategories = {};
		helpers.closeSourceOverlay();
		helpers.closeWikipediaPopup();

		if (!browser && opts.initialMount && seed.enabled) {
			// Server-side: seed in-memory enabled state before assigning
			// state.categories. orderedCategories can compute as soon as
			// categories changes; it needs the enabled list already available
			// for the SSR'd nav to render tabs instead of an empty rail.
			categorySettings.seedFromSSR(seed.enabled);
		}

		// Seed category metadata on both server and client first mount so
		// CategoryNavigation's `getDisplayName` resolves to localized labels
		// from frame zero (e.g. `onthisday` → "Today in History") instead of
		// flashing the raw DB name until /api/categories/metadata resolves.
		if (opts.initialMount) {
			categoryMetadataStore.seedFromSSR(seed.categoryMetadata);
		}

		if (!browser && opts.initialMount) {
			contentFilter.seedFromSSR(seed.contentFilter);
		}

		// Apply experimental flag overrides from the kn_prefs cookie before the
		// client `experimental.init()` reads localStorage. Without this the
		// chaos-index badge ($lib/components/Header.svelte) would render hidden
		// during SSR + first client paint and flash in once init() runs.
		// Always invoked (even with an absent seed) so the module-level state
		// resets to defaults — see experimental.seedFromSSR for the cross-
		// request leak this prevents on adapter-node.
		if (opts.initialMount) {
			experimental.seedFromSSR(seed.experimental);
		}

		// Apply the SSR read-state seed both on the server (for the emitted
		// HTML) and on client `initialMount` (for the just-hydrated state).
		// Without the client branch the read styling would flash off between
		// hydration — when state.readStories resets to {} — and the async
		// reloadReadStories pull from Dexie. reloadReadStories merges into
		// the current state.readStories, so once it lands the seed survives.
		// Only populated for the initial category; Dexie covers the rest.
		// See ssrLoad.loadInitialReadStories.
		if (opts.initialMount && seed.readStories) {
			state.readStories = { ...seed.readStories };
		}

		state.categories = seed.categories;
		state.allCategoryStories = seed.allCategoryStories;
		state.categoryMap = seed.categoryMap;
		state.currentBatchId = seed.batchId;
		state.currentDateSlug = seed.dateSlug;
		state.currentBatchCreatedAt = seed.batchCreatedAt || '';
		state.totalReadCount = seed.totalReadCount;
		state.lastUpdatedTimestamp = seed.timestamp;
		state.lastUpdated = formatTimeAgo(seed.timestamp, helpers.s);
		state.isLatestBatch = seed.isLatestBatch;

		if (
			seed.chaosIndex !== undefined &&
			seed.chaosDescription !== undefined &&
			seed.chaosLastUpdated !== undefined
		) {
			state.chaosIndex = {
				score: seed.chaosIndex,
				summary: seed.chaosDescription,
				lastUpdated: seed.chaosLastUpdated,
			};
		}

		// Initialize localStorage-backed settings on the first browser pass.
		// Order matters: init() must run BEFORE setAllCategories. init() loads
		// the persisted categoryOrder/enabled/disabled from localStorage so that
		// setAllCategories sees the real existing order when computing what's
		// "new" — otherwise it'd see this.order=[] (the Setting constructor
		// default) and overwrite the synced order with the bare seed list.
		if (browser) {
			categorySettings.init();
			categorySettings.setAllCategories(seed.categories);
			categorySettings.initWithDefaults();
			sectionSettings.init();
		}

		// Resolve current category. On initial mount the SSR loader already
		// chose a category via the kn_prefs cookie; on the client we prefer
		// URL → user's enabled[0] → seed.preferredCategory. On subsequent
		// reloads (time travel, language change) keep the current category so
		// the user doesn't get bounced to a different tab.
		const isReload = !opts.initialMount && state.currentCategory;
		const urlParams = browser ? helpers.parseInitialUrl() : {};
		const enabledForLoading = browser
			? categorySettings.enabled.filter((c) => !isOnThisDay(c))
			: [];
		const targetCategory = isReload
			? state.currentCategory
			: urlParams.categoryId ||
				enabledForLoading[0] ||
				seed.preferredCategory ||
				state.currentCategory;

		state.currentCategory = targetCategory;
		state.stories = seed.allCategoryStories[targetCategory] || [];
		state.lastLoadedCategory = targetCategory;

		// Handle a temporary category (URL-driven category the user hasn't enabled).
		if (browser && urlParams.categoryId) {
			const availableIds = seed.categories.map((c) => c.id);
			if (
				!categorySettings.enabled.includes(urlParams.categoryId) &&
				availableIds.includes(urlParams.categoryId)
			) {
				categorySettings.addTemporary(urlParams.categoryId);
				state.temporaryCategory = urlParams.categoryId;
				state.showTemporaryCategoryTooltip = true;
			}
		}

		timeTravelBatch.set(
			state.currentBatchId,
			state.currentBatchCreatedAt || null,
			state.currentDateSlug || null,
			!state.isLatestBatch,
			// On initial mount, normalize entrySource to match the route:
			//   historical → 'url' (user arrived via URL, banner should show)
			//   latest     → null (clear any stale 'url' from a previous request)
			// Without the explicit null on latest, module-level state from a
			// prior historical SSR request on the same Node process can leak
			// through to subsequent /latest requests.
			opts.initialMount ? (state.isLatestBatch ? null : 'url') : undefined,
		);

		// Sync the timeTravel store so the header renders the correct mode on
		// first paint. Module-level $state persists across SSR requests in
		// adapter-node, so on initial mount we must normalize (set OR clear)
		// to avoid a stale historical date leaking into a /latest render and
		// causing a hydration flash.
		if (opts.initialMount) {
			if (!state.isLatestBatch && state.currentBatchCreatedAt) {
				timeTravel.selectDate(new Date(state.currentBatchCreatedAt));
			} else {
				timeTravel.reset();
			}
		}

		state.dataLoaded = true;

		if (!browser) return;

		helpers.updatePageTitle(state.currentCategory);

		// If the seed didn't include stories for the target category (e.g.
		// time-travel reload only ships the current category), fetch them now.
		if (state.stories.length === 0 && !isOnThisDay(targetCategory)) {
			loadStoriesForCategory(targetCategory);
		}

		// Story expansion from URL (e.g. /latest/world/3 → expand story #3).
		// Only on initial mount — reloads shouldn't re-expand.
		if (opts.initialMount && urlParams.storyIndex != null && state.stories[urlParams.storyIndex]) {
			state.initiallyExpandedStoryIndex = urlParams.storyIndex;
			const story = state.stories[urlParams.storyIndex];
			const storyId = story.cluster_number?.toString() || story.title;
			state.expandedStories[storyId] = true;
			if (urlParams.storyIndex >= displaySettings.storyCount) {
				state.storyCountOverride = urlParams.storyIndex + 1;
			}
		}

		if (isOnThisDay(state.currentCategory)) {
			loadOnThisDayEvents();
		}
	}

	function handleDataError(error: string) {
		console.error('Data loading error:', error);
		state.dataLoaded = true;
	}

	// Tracks in-flight category fetches so two near-simultaneous calls (e.g.
	// hover-prefetch + click) for the same category coalesce into one request.
	const inFlightCategoryFetches = new Map<string, Promise<void>>();
	// Incremented on every batch switch (handleDataLoaded). In-flight fetches
	// that resolve after a batch change check this to avoid writing stale data.
	let batchGeneration = 0;

	/**
	 * Load stories for a category. Defaults to switching the active view.
	 * Pass `{ prefetch: true }` to fill `state.allCategoryStories[categoryId]`
	 * in the background without touching `state.stories`, `lastLoadedCategory`,
	 * or `isLoadingCategory` — used by hover-based category prefetching.
	 */
	async function loadStoriesForCategory(categoryId: string, opts: { prefetch?: boolean } = {}) {
		const prefetch = opts.prefetch === true;

		if (isOnThisDay(categoryId)) {
			if (prefetch) return;
			state.isLoadingCategory = true;
			state.stories = [];
			await loadOnThisDayEvents();
			state.isLoadingCategory = false;
			return;
		}

		const cached = state.allCategoryStories[categoryId];
		if (cached?.length) {
			if (!prefetch) {
				state.stories = cached;
				state.lastLoadedCategory = categoryId;
				state.isLoadingCategory = false;
			}
			return;
		}

		// Cold or in-flight: clear stale stories and show the skeleton.
		// Without this, the previous category's stories stay visible until
		// the fetch resolves (~300ms) — feels broken on tab switches.
		if (!prefetch) {
			state.stories = [];
			state.isLoadingCategory = true;
			state.lastLoadedCategory = categoryId;
		}

		const existing = inFlightCategoryFetches.get(categoryId);
		if (existing) {
			await existing;
			if (!prefetch) {
				state.stories = state.allCategoryStories[categoryId] || [];
				state.isLoadingCategory = false;
			}
			return;
		}

		const categoryUuid = state.categoryMap[categoryId];
		if (!categoryUuid) {
			console.warn(`Category UUID not found for ${categoryId}`);
			if (!prefetch) {
				state.stories = [];
				state.isLoadingCategory = false;
			}
			return;
		}

		const gen = batchGeneration;
		state.loadingCategories[categoryId] = true;
		const fetchPromise = (async () => {
			try {
				const result = await dataService.loadStories(
					state.currentBatchId,
					categoryUuid,
					STORIES_PER_CATEGORY,
					languageSettings.getLanguageForAPI(),
				);
				// Discard if a batch switch happened while this was in flight
				if (gen !== batchGeneration) return;
				state.allCategoryStories[categoryId] = result.stories;
				if (!prefetch) {
					state.stories = result.stories;
					state.totalReadCount = result.readCount;
					state.lastUpdated = formatTimeAgo(result.timestamp, helpers.s);
				}
			} catch (err) {
				console.error('Error loading stories for category:', categoryId, err);
			} finally {
				// A batch / date / language reload bumps the generation, clears the
				// in-flight map and starts fresh fetches. If this request is stale,
				// its cleanup would wipe the *newer* request's loading marker and
				// in-flight entry — killing that category's skeleton early and
				// defeating the dedupe. Only the current generation cleans up.
				if (gen === batchGeneration) {
					if (!prefetch) {
						state.isLoadingCategory = false;
					}
					delete state.loadingCategories[categoryId];
					inFlightCategoryFetches.delete(categoryId);
				}
			}
		})();

		inFlightCategoryFetches.set(categoryId, fetchPromise);
		await fetchPromise;
	}

	async function loadOnThisDayEvents() {
		try {
			state.lastLoadedCategory = 'onthisday';
			const result = await dataService.loadOnThisDayEvents(languageSettings.getLanguageForAPI());
			state.onThisDayEvents = result.events;
			state.onThisDayLanguage = result.language;
		} catch (error) {
			console.error('Error loading OnThisDay events:', error);
		}
	}

	return {
		handleDataLoaded,
		handleDataError,
		loadStoriesForCategory,
		loadOnThisDayEvents,
	};
}
