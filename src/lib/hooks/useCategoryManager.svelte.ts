import { browser } from '$app/environment';
import { displaySettings } from '$lib/data/settings.svelte';
import { getCategoryDisplayName } from '$lib/utils/category';
import { pageMetadata } from '$lib/stores/pageMetadata.svelte';
import type { Category } from '$lib/types';
import { navigationHandlerService } from '$lib/services/navigationHandlerService';
import type { StoryListInstance, HistoryManagerInstance } from '$lib/types/components';

interface CategoryManagerOptions {
	categories: Category[];
	currentCategory: string;
	temporaryCategory: string | null;
	historyManager: HistoryManagerInstance | undefined;
	isSinglePageMode: boolean;
	storyList: StoryListInstance | undefined;
	loadStoriesForCategory: (categoryId: string) => Promise<void>;
	updatePageTitle: (categoryId: string) => void;
	setCurrentCategory: (categoryId: string) => void;
	clearExpandedStories: () => void;
	clearInitiallyExpandedStoryIndex: () => void;
	clearStoryCountOverride: () => void;
	clearTemporaryCategory: () => void;
}

/**
 * Manages category navigation and switching
 */
export function useCategoryManager(options: () => CategoryManagerOptions) {
	function handleCategoryChange(category: string, updateUrl: boolean = true) {
		const opts = options();

		if (category === opts.currentCategory) {
			return;
		}

		// Set the new category
		opts.setCurrentCategory(category);

		// Update the page title when category changes
		opts.updatePageTitle(category);

		// Clear expanded stories when switching categories
		opts.clearExpandedStories();

		// Clear initially expanded story flag when changing categories
		opts.clearInitiallyExpandedStoryIndex();

		// Clear temporary category if user manually navigates
		if (updateUrl && opts.temporaryCategory) {
			opts.clearTemporaryCategory();
		}

		// Reset story count override when changing categories
		if (updateUrl) {
			opts.clearStoryCountOverride();
		}

		// Load stories for the new category
		opts.loadStoriesForCategory(category);

		// Update URL to reflect new category
		if (opts.historyManager && updateUrl && !navigationHandlerService.isNavigating() && !opts.isSinglePageMode) {
			opts.historyManager.updateUrl({ categoryId: category, storyIndex: null });
		}

		// Auto-expand all if mode is set
		if (displaySettings.storyExpandMode === 'always') {
			opts.storyList?.toggleExpandAll();
		}
	}

	function updatePageTitle(categoryId: string) {
		const opts = options();
		const categoryObj = opts.categories.find((c) => c.id === categoryId);

		if (categoryObj) {
			const displayName = getCategoryDisplayName(categoryObj);
			pageMetadata.title = displayName;

			if (browser && document) {
				document.title = `${displayName} | Kagi News`;
			}
		}
	}

	return {
		handleCategoryChange,
		updatePageTitle,
	};
}
