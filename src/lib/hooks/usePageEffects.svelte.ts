import { categorySwipeHandler } from '$lib/utils/categorySwipeHandler';
import type { Category } from '$lib/types';

interface PageEffectsOptions {
	dataLoaded: boolean;
	orderedCategories: Category[];
	currentCategory: string;
	temporaryCategory: string | null;
	loadStoriesForCategory: (categoryId: string) => Promise<void>;
	handleCategoryChange: (category: string, updateUrl: boolean) => void;
	setCurrentCategory: (category: string) => void;
}

/**
 * Manages page-level reactive effects
 */
export function usePageEffects(options: () => PageEffectsOptions) {
	// Category initialization and swipe handling
	$effect(() => {
		const opts = options();
		if (!opts.dataLoaded) return;

		// Initialize category if needed
		if (
			opts.orderedCategories.length > 0 &&
			!opts.orderedCategories.find((cat) => cat.id === opts.currentCategory) &&
			!(opts.temporaryCategory && opts.currentCategory === opts.temporaryCategory)
		) {
			opts.setCurrentCategory(opts.orderedCategories[0].id);
			return;
		}

		// Update swipe handler
		if (opts.orderedCategories.length > 0) {
			categorySwipeHandler.updateState(
				opts.orderedCategories,
				opts.currentCategory,
				(category: string) => opts.handleCategoryChange(category, true),
			);
		}

		// Load stories if category is valid
		if (opts.currentCategory && opts.orderedCategories.find((cat) => cat.id === opts.currentCategory)) {
			opts.loadStoriesForCategory(opts.currentCategory);
		}
	});
}
