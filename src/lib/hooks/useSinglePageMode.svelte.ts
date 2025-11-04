import type { Category } from '$lib/types';
import type { HistoryManagerInstance } from '$lib/types/components';

interface SinglePageModeOptions {
	isSinglePageMode: boolean;
	dataLoaded: boolean;
	orderedCategories: Category[];
	loadStoriesForCategory: (categoryId: string) => Promise<void>;
	historyManager: HistoryManagerInstance | undefined;
	currentCategory: string;
}

/**
 * Manages single page mode effects and category loading
 */
export function useSinglePageMode(options: () => SinglePageModeOptions) {
	let loadedCategoriesForSinglePage = new Set<string>();
	let previousSinglePageMode: boolean | null = null;
	let previousSinglePageModeForLoading: boolean | null = null;

	// Effect to load categories when single page mode is ENABLED (transition from false to true)
	$effect(() => {
		const opts = options();
		if (!opts.dataLoaded) return;

		// Track the transition
		const currentMode = opts.isSinglePageMode;

		// Only load categories when transitioning from disabled to enabled
		// Skip on initial page load (previousSinglePageModeForLoading === null)
		if (previousSinglePageModeForLoading !== null &&
		    previousSinglePageModeForLoading === false &&
		    currentMode === true) {
			console.log('[SinglePage] Mode enabled - loading all categories');

			// Find categories that need to be loaded
			const categoriesToLoad: string[] = [];
			for (const category of opts.orderedCategories) {
				if (!loadedCategoriesForSinglePage.has(category.id)) {
					console.log('[SinglePage] Category needs loading:', category.id);
					categoriesToLoad.push(category.id);
					loadedCategoriesForSinglePage.add(category.id);
				}
			}

			if (categoriesToLoad.length > 0) {
				Promise.all(categoriesToLoad.map(catId => opts.loadStoriesForCategory(catId)));
			}
		}

		previousSinglePageModeForLoading = currentMode;
	});

	// Reset tracking when exiting single page mode
	$effect(() => {
		const opts = options();
		if (!opts.isSinglePageMode) {
			loadedCategoriesForSinglePage.clear();
		}
	});

	// Update URL when single page mode changes
	$effect(() => {
		const opts = options();
		if (!opts.historyManager || !opts.dataLoaded) return;

		// Only update URL if the mode actually changed, not on every reactivity trigger
		if (previousSinglePageMode !== null && previousSinglePageMode === opts.isSinglePageMode) {
			return;
		}

		previousSinglePageMode = opts.isSinglePageMode;

		if (opts.isSinglePageMode) {
			opts.historyManager.updateUrl({ categoryId: '', storyIndex: null });
		} else if (opts.currentCategory) {
			opts.historyManager.updateUrl({ categoryId: opts.currentCategory, storyIndex: null });
		}
	});

	return {};
}
