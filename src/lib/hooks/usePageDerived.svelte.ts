import { categorySettings, displaySettings } from '$lib/data/settings.svelte';
import { categoryMetadataStore } from '$lib/stores/categoryMetadata.svelte';
import { contentFilter } from '$lib/stores/contentFilter.svelte';
import type { Category, Story } from '$lib/types';
import { filterStories } from '$lib/utils/contentFilter';
import { orderStoriesForSinglePage } from '$lib/utils/storyOrdering';

interface DerivedStateOptions {
	categories: Category[];
	temporaryCategory: string | null;
	stories: Story[];
	expandedStories: Record<string, boolean>;
	allCategoryStories: Record<string, Story[]>;
	loadingCategories: Record<string, true>;
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
		console.log(
			'[Page] Computing orderedCategories, enabled:',
			$state.snapshot(categorySettings.enabled),
		);

		if (opts.categories.length === 0) {
			return opts.categories;
		}

		if (categorySettings.enabled.length === 0) {
			return [];
		}

		const orderedList: Category[] = [];

		// Add categories in the exact order they appear in enabled.
		// Include categories not in the current batch so they still show in
		// nav with the "no stories" empty state.
		for (const categoryId of categorySettings.enabled) {
			const category = opts.categories.find((cat) => cat.id === categoryId);
			if (category) {
				orderedList.push(category);
			} else {
				// Category is enabled but not in current batch — create a placeholder
				const metadata = categoryMetadataStore.findById(categoryId);
				orderedList.push({
					id: categoryId,
					name: metadata?.displayName ?? categoryId,
				});
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

	// Take stories per category the same way StoryList does for a single category:
	// let the content filter pick from the whole pool so hidden stories are
	// backfilled rather than leaving the category short (KNEWS-441).
	const pickStories = (stories: Story[], limit: number): Story[] =>
		contentFilter.isActive
			? filterStories(
					stories,
					contentFilter.keywords,
					contentFilter.filterScope,
					contentFilter.filterMode,
					limit,
				).filtered
			: stories.slice(0, limit);

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
				.flatMap((cat) => opts.allCategoryStories[cat.id] || [])
				.map((s) => s.id || s.title)
				.join(',');
			const filterKey = contentFilter.isActive
				? `${contentFilter.keywords.join('|')}-${contentFilter.filterScope}-${contentFilter.filterMode}`
				: '';
			const cacheKey = `${storyIds}-${perCategoryLimit}-${orderedCategories.map((c) => c.id).join(',')}-${filterKey}`;

			// Only re-shuffle if the underlying data changed
			if (cachedRandomKey !== cacheKey) {
				cachedRandomStories = orderStoriesForSinglePage(
					opts.allCategoryStories,
					orderedCategories,
					singlePageMode,
					perCategoryLimit,
					pickStories,
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
			pickStories,
		);
	});

	// Categories whose stories are still in flight, each anchored to the loaded
	// category it should render above (`beforeCategoryId: null` = after
	// everything loaded so far). Single page mode fills every category in
	// parallel and they resolve in arbitrary order, so a pending section has to
	// be placed by its position in orderedCategories rather than appended —
	// otherwise a category that lands early would jump above the placeholders
	// for categories that precede it (KNEWS-448).
	const singlePagePendingSections = $derived.by(() => {
		if (!isSinglePageMode) return [];
		const opts = options();

		const pending: { id: string; name: string; beforeCategoryId: string | null }[] = [];
		let waiting: { id: string; name: string }[] = [];

		for (const category of orderedCategories) {
			if (opts.loadingCategories[category.id]) {
				waiting.push({ id: category.id, name: category.name });
				continue;
			}
			// A loaded category with stories anchors everything queued so far.
			if ((opts.allCategoryStories[category.id] || []).length > 0) {
				for (const w of waiting) pending.push({ ...w, beforeCategoryId: category.id });
				waiting = [];
			}
		}
		for (const w of waiting) pending.push({ ...w, beforeCategoryId: null });

		return pending;
	});

	// How many stories the filter removed on the way to each category's count.
	// StoryList cannot derive this in single page mode because it only ever sees
	// the already-backfilled list, not the pools it was drawn from.
	const singlePageHiddenCount = $derived.by(() => {
		if (!isSinglePageMode || !contentFilter.isActive) return 0;
		const opts = options();
		const perCategoryLimit = opts.storyCountOverride ?? displaySettings.storyCount;
		return orderedCategories.reduce((total, category) => {
			const categoryStories = opts.allCategoryStories[category.id] || [];
			if (categoryStories.length === 0) return total;
			return (
				total +
				filterStories(
					categoryStories,
					contentFilter.keywords,
					contentFilter.filterScope,
					contentFilter.filterMode,
					perCategoryLimit,
				).filteredCount
			);
		}, 0);
	});

	// Compute current story index from expanded stories
	// Must be after singlePageStories is defined
	$effect(() => {
		const opts = options();
		const expandedStoryId = Object.keys(opts.expandedStories).find(
			(id) => opts.expandedStories[id],
		);

		if (!expandedStoryId) {
			currentStoryIndex = null;
			return;
		}

		// In single page mode, search in singlePageStories; otherwise use opts.stories
		const searchStories = isSinglePageMode ? singlePageStories : opts.stories;

		const story = searchStories.find(
			(s) =>
				s.id === expandedStoryId ||
				s.cluster_number?.toString() === expandedStoryId ||
				s.title === expandedStoryId,
		);

		if (!story) {
			console.log('❌ [usePageDerived] Story NOT found!', {
				expandedStoryId,
				storiesCount: searchStories.length,
				isSinglePageMode,
				firstStoryId: searchStories[0]?.id,
				firstStoryCluster: searchStories[0]?.cluster_number,
				allStoryIds: searchStories.slice(0, 3).map((s) => s.id),
			});
			currentStoryIndex = null;
		} else {
			const index = searchStories.indexOf(story);
			console.log('✅ [usePageDerived] Story FOUND at index:', index, {
				storyTitle: story?.title,
				storyId: story?.id,
				expandedStoryId,
				isSinglePageMode,
				storiesCount: searchStories.length,
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
		get singlePageHiddenCount() {
			return singlePageHiddenCount;
		},
		get singlePagePendingSections() {
			return singlePagePendingSections;
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
