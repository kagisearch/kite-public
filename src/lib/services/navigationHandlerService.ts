import type { SupportedLanguage } from '$lib/data/settings.svelte';
import type { Category, Story } from '$lib/types';
import { dataReloadService, dataService } from './dataService';
import { type NavigationParams, UrlNavigationService } from './urlNavigationService';

export interface NavigationState {
	currentBatchId: string;
	currentDateSlug?: string;
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
			params.storyIndex === undefined
		) {
			return {};
		}

		this.isHandlingNavigation = true;
		this.lastHandledUrl = navigationKey;

		const updates: Partial<NavigationState> = {};

		try {
			// Language settings are stored in localStorage only
			// Ignore data_lang from URL parameters

			// Handle batch change only if explicitly provided and different
			if (params.batchId !== undefined) {
				// Check if we're switching from current batch to a different one
				const switchingToLatest = !params.batchId && !state.isLatestBatch;
				// Support both UUID and date slug comparison
				const isSameBatch =
					params.batchId === state.currentBatchId || params.batchId === state.currentDateSlug;
				const switchingToSpecific = params.batchId && !isSameBatch;

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
			let effectiveCategoryId = state.currentCategory;
			if (params.categoryId !== undefined) {
				const targetCategory = params.categoryId || 'world';
				// Normalize to match the actual category IDs (lowercase)
				const normalizedTarget = UrlNavigationService.normalizeCategoryId(targetCategory);
				const normalizedCurrent = UrlNavigationService.normalizeCategoryId(state.currentCategory);

				console.log('🔍 [NavigationHandler] Category check:', {
					paramsCategoryId: params.categoryId,
					normalizedTarget,
					normalizedCurrent,
					needsChange: normalizedTarget !== normalizedCurrent,
				});

				if (normalizedTarget !== normalizedCurrent) {
					// Find the actual category ID from our categories list
					const actualCategory = state.categories.find(
						(cat) => UrlNavigationService.normalizeCategoryId(cat.id) === normalizedTarget,
					);
					if (actualCategory) {
						console.log('🔍 [NavigationHandler] Switching category to:', actualCategory.id);
						callbacks.handleCategoryChange(actualCategory.id, false);
						effectiveCategoryId = actualCategory.id;
						// Wait for category change to complete
						await new Promise((resolve) => setTimeout(resolve, 50));
					} else {
						// Default to first category if not found
						console.warn('Category not found in list:', normalizedTarget);
						callbacks.handleCategoryChange(state.categories[0]?.id || 'world', false);
						effectiveCategoryId = state.categories[0]?.id || 'world';
						await new Promise((resolve) => setTimeout(resolve, 50));
					}
				}
			}

			// Handle story expansion - either by storyIndex or clusterId
			// New format URLs provide clusterId, legacy URLs provide storyIndex
			let targetStoryIndex: number | null = null;

			if (params.clusterId !== undefined && params.clusterId !== null) {
				// New format: find story by clusterId
				// Use the effective category (the one we just switched to, if any)
				const categoryStories = state.allCategoryStories[effectiveCategoryId] || state.stories;
				console.log(
					'🔍 [NavigationHandler] Searching for clusterId:',
					params.clusterId,
					'in category:',
					effectiveCategoryId,
					'stories count:',
					categoryStories.length,
				);

				targetStoryIndex = categoryStories.findIndex(
					(story) => story.cluster_number === params.clusterId,
				);

				console.log('🔍 [NavigationHandler] Found story at index:', targetStoryIndex);

				if (targetStoryIndex === -1) {
					targetStoryIndex = null;
				}
			} else if (params.storyIndex !== undefined) {
				// Legacy format: use storyIndex directly
				targetStoryIndex = params.storyIndex;
			}

			if (targetStoryIndex !== undefined) {
				// Clear all expanded stories first
				updates.expandedStories = {};

				if (targetStoryIndex !== null) {
					// Get stories for the effective category
					const categoryStories = state.allCategoryStories[effectiveCategoryId] || state.stories;
					if (categoryStories[targetStoryIndex]) {
						const story = categoryStories[targetStoryIndex];
						// Use the same identifier logic as StoryList: id (UUID) first, then cluster_number, then title
						const storyId = story.id || story.cluster_number?.toString() || story.title;
						console.log('🔍 [NavigationHandler] Setting expandedStories:', {
							storyId,
							storyTitle: story.title,
						});
						updates.expandedStories = { [storyId]: true };

						// Check if we need to override story count limit
						// We need this when the story index exceeds the default limit
						const { displaySettings } = await import('$lib/data/settings.svelte.js');
						if (targetStoryIndex >= displaySettings.storyCount) {
							// Set override to show at least up to the requested story
							updates.storyCountOverride = targetStoryIndex + 1;
						}
					} else {
						console.warn('🔍 [NavigationHandler] Story not found at index:', targetStoryIndex);
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
