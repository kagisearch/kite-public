import { categorySettings, displaySettings } from '$lib/data/settings.svelte';
import { orderStoriesForSinglePage } from '$lib/utils/storyOrdering';
import type { Category, Story } from '$lib/types';

interface DerivedStateOptions {
	categories: Category[];
	temporaryCategory: string | null;
	stories: Story[];
	expandedStories: Record<string, boolean>;
	allCategoryStories: Record<string, Story[]>;
	storyCountOverride: number | null;
}

/**
 * Manages all derived/computed state for the page
 */
export function usePageDerived(options: () => DerivedStateOptions) {
	// Compute current story index from expanded stories
	// NOTE: This will be recalculated after singlePageStories is defined
	let currentStoryIndex = $state<number | null>(null);

	// Create ordered categories based on settings
	const orderedCategories = $derived.by(() => {
		const opts = options();
		console.log('[Page] Computing orderedCategories, enabled:', $state.snapshot(categorySettings.enabled));

		if (opts.categories.length === 0) {
			return opts.categories;
		}

		if (categorySettings.enabled.length === 0) {
			return [];
		}

		const orderedList: Category[] = [];

		// Add categories in the exact order they appear in enabled
		for (const categoryId of categorySettings.enabled) {
			const category = opts.categories.find((cat) => cat.id === categoryId);
			if (category) {
				orderedList.push(category);
			}
		}

		// Add temporary category if it exists and isn't already in the list
		if (opts.temporaryCategory && !orderedList.find((cat) => cat.id === opts.temporaryCategory)) {
			const tempCat = opts.categories.find((cat) => cat.id === opts.temporaryCategory);
			if (tempCat) {
				orderedList.push(tempCat);
			}
		}

		console.log(
			'[Page] orderedCategories result:',
			orderedList.map((c) => c.id),
		);
		return orderedList;
	});

	// Single page mode state
	const singlePageMode = $derived(categorySettings.singlePageMode);
	const isSinglePageMode = $derived(singlePageMode !== 'disabled');

	// Cache for random mode to prevent re-shuffling on every reactivity trigger
	let cachedRandomStories: ReturnType<typeof orderStoriesForSinglePage> | null = null;
	let cachedRandomKey = '';

	// Ordered stories for single page mode
	const singlePageStories = $derived.by(() => {
		const opts = options();
		if (!isSinglePageMode) {
			cachedRandomStories = null;
			cachedRandomKey = '';
			return [];
		}
		const perCategoryLimit = opts.storyCountOverride ?? displaySettings.storyCount;

		// For random mode, cache the result to prevent re-shuffling
		if (singlePageMode === 'random') {
			// Create a stable key based on the actual story data
			const storyIds = orderedCategories
				.flatMap(cat => opts.allCategoryStories[cat.id] || [])
				.map(s => s.id || s.title)
				.join(',');
			const cacheKey = `${storyIds}-${perCategoryLimit}-${orderedCategories.map(c => c.id).join(',')}`;

			// Only re-shuffle if the underlying data changed
			if (cachedRandomKey !== cacheKey) {
				cachedRandomStories = orderStoriesForSinglePage(
					opts.allCategoryStories,
					orderedCategories,
					singlePageMode,
					perCategoryLimit,
				);
				cachedRandomKey = cacheKey;
			}

			return cachedRandomStories!;
		}

		// For non-random modes, compute normally
		return orderStoriesForSinglePage(
			opts.allCategoryStories,
			orderedCategories,
			singlePageMode,
			perCategoryLimit,
		);
	});

	// Compute current story index from expanded stories
	// Must be after singlePageStories is defined
	$effect(() => {
		const opts = options();
		const expandedStoryId = Object.keys(opts.expandedStories).find((id) => opts.expandedStories[id]);

		if (!expandedStoryId) {
			currentStoryIndex = null;
			return;
		}

		// In single page mode, search in singlePageStories; otherwise use opts.stories
		const searchStories = isSinglePageMode ? singlePageStories : opts.stories;

		const story = searchStories.find(
			(s) => s.id === expandedStoryId || s.cluster_number?.toString() === expandedStoryId || s.title === expandedStoryId,
		);

		if (!story) {
			console.log('❌ [usePageDerived] Story NOT found!', {
				expandedStoryId,
				storiesCount: searchStories.length,
				isSinglePageMode,
				firstStoryId: searchStories[0]?.id,
				firstStoryCluster: searchStories[0]?.cluster_number,
				allStoryIds: searchStories.slice(0, 3).map(s => s.id)
			});
			currentStoryIndex = null;
		} else {
			const index = searchStories.indexOf(story);
			console.log('✅ [usePageDerived] Story FOUND at index:', index, {
				storyTitle: story?.title,
				storyId: story?.id,
				expandedStoryId,
				isSinglePageMode,
				storiesCount: searchStories.length
			});
			currentStoryIndex = index;
		}
	});

	// Reactive category header position
	const categoryHeaderPosition = $derived(displaySettings.categoryHeaderPosition);
	const storyExpandMode = $derived(displaySettings.storyExpandMode);

	return {
		get currentStoryIndex() {
			return currentStoryIndex;
		},
		get orderedCategories() {
			return orderedCategories;
		},
		get singlePageMode() {
			return singlePageMode;
		},
		get isSinglePageMode() {
			return isSinglePageMode;
		},
		get singlePageStories() {
			return singlePageStories;
		},
		get categoryHeaderPosition() {
			return categoryHeaderPosition;
		},
		get storyExpandMode() {
			return storyExpandMode;
		},
	};
}
