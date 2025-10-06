import type { SupportedLanguage } from '$lib/data/settings.svelte';
import type { Category, Story } from '$lib/types';
import { dataReloadService, dataService } from './dataService';
import { type NavigationParams, UrlNavigationService } from './urlNavigationService';

export interface NavigationState {
	currentBatchId: string;
	currentCategory: string;
	categories: Category[];
	stories: Story[];
	allCategoryStories: Record<string, Story[]>;
	expandedStories: Record<string, boolean>;
	isLatestBatch: boolean;
	storyCountOverride?: number | null;
}

export interface NavigationCallbacks {
	setDataLanguage: (lang: SupportedLanguage) => void;
	getCurrentDataLanguage: () => SupportedLanguage;
	handleCategoryChange: (categoryId: string, updateUrl: boolean) => void;
	onNavigationComplete?: () => void;
}

/**
 * Service to handle navigation state changes from URL updates
 */
export class NavigationHandlerService {
	private isHandlingNavigation = false;
	private lastHandledUrl = '';

	/**
	 * Handle navigation from URL changes
	 */
	async handleUrlNavigation(
		params: NavigationParams,
		state: NavigationState,
		callbacks: NavigationCallbacks,
	): Promise<Partial<NavigationState>> {
		// Create a unique key for this navigation request
		const navigationKey = JSON.stringify(params);

		// Prevent handling the same navigation twice
		if (this.lastHandledUrl === navigationKey) {
			return {};
		}

		// Prevent recursive navigation
		if (this.isHandlingNavigation) return {};

		// Skip if all params are undefined (no actual navigation needed)
		if (
			params.batchId === undefined &&
			params.categoryId === undefined &&
			params.storyIndex === undefined &&
			params.dataLang === undefined
		) {
			return {};
		}

		this.isHandlingNavigation = true;
		this.lastHandledUrl = navigationKey;

		const updates: Partial<NavigationState> = {};

		try {
			// Handle data language change first
			if (
				params.dataLang !== undefined &&
				params.dataLang !== null &&
				params.dataLang !== callbacks.getCurrentDataLanguage()
			) {
				// Validate it's a supported language
				if (UrlNavigationService.isValidDataLanguage(params.dataLang)) {
					console.log('Setting data language from URL:', params.dataLang);
					callbacks.setDataLanguage(params.dataLang as SupportedLanguage);
					// Wait a bit for the language change to propagate
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}

			// Handle batch change only if explicitly provided and different
			if (params.batchId !== undefined) {
				// Check if we're switching from current batch to a different one
				const switchingToLatest = !params.batchId && !state.isLatestBatch;
				const switchingToSpecific = params.batchId && params.batchId !== state.currentBatchId;

				if (switchingToLatest) {
					// Navigate to latest batch
					updates.isLatestBatch = true;
					dataService.setTimeTravelBatch(null);
					await dataReloadService.reloadData();
					return updates; // Let the reload handle everything else
				} else if (switchingToSpecific) {
					// We need to check if this is actually a historical batch
					// For now, we'll rely on the DataLoader's logic which already checked
					// Don't set time travel mode here - let DataLoader handle it
					console.log('Batch change detected but not setting time travel mode here');
					await dataReloadService.reloadData();
					return updates; // Let the reload handle everything else
				}
				// If batch hasn't changed, continue to handle category/story changes
			}

			// Handle category change - normalize case
			if (params.categoryId !== undefined) {
				const targetCategory = params.categoryId || 'world';
				// Normalize to match the actual category IDs (lowercase)
				const normalizedTarget = UrlNavigationService.normalizeCategoryId(targetCategory);
				const normalizedCurrent = UrlNavigationService.normalizeCategoryId(state.currentCategory);

				if (normalizedTarget !== normalizedCurrent) {
					// Find the actual category ID from our categories list
					const actualCategory = state.categories.find(
						(cat) => UrlNavigationService.normalizeCategoryId(cat.id) === normalizedTarget,
					);
					if (actualCategory) {
						callbacks.handleCategoryChange(actualCategory.id, false);
						// Wait for category change to complete
						await new Promise((resolve) => setTimeout(resolve, 50));
					} else {
						// Default to first category if not found
						console.warn('Category not found in list:', normalizedTarget);
						callbacks.handleCategoryChange(state.categories[0]?.id || 'world', false);
						await new Promise((resolve) => setTimeout(resolve, 50));
					}
				}
			}

			// Handle story expansion - after category is loaded
			if (params.storyIndex !== undefined) {
				// Clear all expanded stories first
				updates.expandedStories = {};

				if (params.storyIndex !== null) {
					// Get stories for the current category
					const categoryStories = state.allCategoryStories[state.currentCategory] || state.stories;
					if (categoryStories[params.storyIndex]) {
						const story = categoryStories[params.storyIndex];
						const storyId = story.cluster_number?.toString() || story.title;
						updates.expandedStories = { [storyId]: true };

						// Check if we need to override story count limit
						// We need this when the story index exceeds the default limit
						const { displaySettings } = await import('$lib/data/settings.svelte.js');
						if (params.storyIndex >= displaySettings.storyCount) {
							// Set override to show at least up to the requested story
							updates.storyCountOverride = params.storyIndex + 1;
						}
					}
				}
			}

			return updates;
		} finally {
			// Reset flag after a delay to allow state to settle
			setTimeout(() => {
				this.isHandlingNavigation = false;
				callbacks.onNavigationComplete?.();
			}, 100);
		}
	}

	/**
	 * Check if currently handling navigation
	 */
	isNavigating(): boolean {
		return this.isHandlingNavigation;
	}
}

// Export singleton instance
export const navigationHandlerService = new NavigationHandlerService();
