import { displaySettings } from '$lib/data/settings.svelte';
import { kiteDB } from '$lib/db/dexie';
import type { Story } from '$lib/types';
import type { HistoryManagerInstance } from '$lib/types/components';
import type { StoryWithCategory } from '$lib/utils/storyOrdering';

interface StoryToggleOptions {
	isSinglePageMode: boolean;
	singlePageStories: StoryWithCategory[];
	stories: Story[];
	currentBatchId: string;
	categoryMap: Record<string, string>;
	currentCategory: string;
	handleCategoryChange?: (categoryId: string, updateUrl: boolean) => void;
}

/**
 * Manages story expand/collapse logic and read state
 */
export function useStoryToggle(
	getExpandedStories: () => Record<string, boolean>,
	setExpandedStories: (value: Record<string, boolean>) => void,
	getReadStories: () => Record<string, boolean>,
	setReadStories: (value: Record<string, boolean>) => void,
	initiallyExpandedStoryIndex: number | null,
	getHistoryManager: () => HistoryManagerInstance | undefined,
	options: () => StoryToggleOptions,
) {
	function handleToggle(storyId: string, updateUrl: boolean = true) {
		const opts = options();
		const historyManager = getHistoryManager();

		// Clear initially expanded story flag on any manual toggle
		if (initiallyExpandedStoryIndex !== null) {
			initiallyExpandedStoryIndex = null;
		}

		// Get current state
		const currentExpandedStories = getExpandedStories();
		const currentlyExpanded = currentExpandedStories[storyId];

		// Create a new object with existing expanded stories to ensure reactivity
		let newExpandedStories: Record<string, boolean> = { ...currentExpandedStories };

		// Toggle the clicked story
		if (!currentlyExpanded) {
			// If single story mode is enabled, collapse all other stories first
			if (displaySettings.storyOpenMode === 'single') {
				newExpandedStories = {};
			}
			newExpandedStories[storyId] = true;

			// Find the story and mark it as read
			const storyList = opts.isSinglePageMode ? opts.singlePageStories : opts.stories;
			const story = storyList.find(
				(s) => s.id === storyId || s.cluster_number?.toString() === storyId || s.title === storyId,
			);

			// In single page mode, if the story is from a different category, switch to that category first
			if (opts.isSinglePageMode && story && opts.handleCategoryChange) {
				const storyWithCategory = story as StoryWithCategory;
				if (
					storyWithCategory._categoryId &&
					storyWithCategory._categoryId !== opts.currentCategory
				) {
					opts.handleCategoryChange(storyWithCategory._categoryId, false);
				}
			}

			if (story?.id) {
				// Mark as read - use UUID directly
				const uniqueStoryId = story.id;
				console.log('Marking story as read:', {
					title: story.title,
					uuid: story.id,
				});

				// Update read stories state
				const currentReadStories = getReadStories();
				setReadStories({ ...currentReadStories, [uniqueStoryId]: true });

				// Also save to IndexedDB (non-blocking)
				const categoryUuid = opts.categoryMap[opts.currentCategory];
				if (story.id) {
					kiteDB.markStoryAsRead(story.id, story.title, opts.currentBatchId, categoryUuid);
				}

				// Update URL with story index
				if (updateUrl && historyManager) {
					const storyIndex = storyList.indexOf(story);
					if (storyIndex >= 0) {
						historyManager.updateUrl({ storyIndex });
					}
				}
			}
		} else {
			// Story is being collapsed
			delete newExpandedStories[storyId];

			// Remove from URL if this was the last expanded story
			if (updateUrl && historyManager && Object.keys(newExpandedStories).length === 0) {
				historyManager.updateUrl({ storyIndex: null });
			}
		}

		// Set the new expanded stories state
		setExpandedStories(newExpandedStories);
	}

	return {
		handleToggle,
	};
}
