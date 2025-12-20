<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { categorySettings, displaySettings } from '$lib/data/settings.svelte.js';
import { kiteDB } from '$lib/db/dexie';
import { keyboardNavigation } from '$lib/stores/keyboardNavigation.svelte';
import { contentFilter } from '$lib/stores/contentFilter.svelte.js';
import type { Story } from '$lib/types';
import { type FilteredStory, filterStories } from '$lib/utils/contentFilter';
import type { StoryWithCategory } from '$lib/utils/storyOrdering';
import StoryCard from './story/StoryCard.svelte';

// Props
interface Props {
	stories?: Story[] | StoryWithCategory[];
	currentCategory: string;
	categoryUuid?: string;
	batchId?: string;
	batchDateSlug?: string | null; // Date slug with sequence number for share URLs
	readStories?: Record<string, boolean>;
	expandedStories?: Record<string, boolean>;
	onStoryToggle?: (storyId: string) => void;
	showSourceOverlay?: boolean;
	currentSource?: any;
	sourceArticles?: any[];
	currentMediaInfo?: any;
	isLoadingMediaInfo?: boolean;
	storyCountOverride?: number | null;
	isSharedView?: boolean;
	sharedArticleIndex?: number | null;
	sharedClusterId?: number | null; // For new URL format
	initiallyExpandedIndex?: number | null;
	showCategoryLabels?: boolean; // Show category labels for single page mode
	skipStoryCountLimit?: boolean; // Skip story count limit (for single page mode)
}

let {
	stories = [],
	currentCategory,
	categoryUuid,
	batchId,
	batchDateSlug = null,
	readStories = $bindable({}),
	expandedStories = $bindable({}),
	onStoryToggle,
	showSourceOverlay = $bindable(false),
	currentSource = $bindable(null),
	sourceArticles = $bindable([]),
	currentMediaInfo = $bindable(null),
	isLoadingMediaInfo = $bindable(false),
	storyCountOverride = null,
	isSharedView = false,
	sharedArticleIndex = null,
	sharedClusterId = null,
	initiallyExpandedIndex = null,
	showCategoryLabels = false,
	skipStoryCountLimit = false,
}: Props = $props();

// Handle story toggle
function handleStoryToggle(story: Story) {
	// Use UUID as primary identifier for uniqueness across categories
	// Fall back to cluster_number or title for backwards compatibility
	const storyId = story.id || story.cluster_number?.toString() || story.title;
	if (onStoryToggle) {
		onStoryToggle(storyId);
	}
}

// Track sequence numbers to ignore stale responses
const toggleSequence = new Map<string, number>();

// Handle read status toggle
async function handleReadToggle(story: Story) {
	if (!story.id) return; // Skip if no UUID
	const storyId = story.id; // Use UUID directly

	// Increment sequence number for this story
	const currentSeq = (toggleSequence.get(storyId) || 0) + 1;
	toggleSequence.set(storyId, currentSeq);

	const wasRead = readStories[storyId] || false;
	const isNowRead = !wasRead;

	// Optimistic UI update - show immediately for instant feedback
	if (isNowRead) {
		readStories[storyId] = true;
	} else {
		delete readStories[storyId];
	}
	readStories = { ...readStories }; // Trigger reactivity

	// Persist to database in background
	if (isNowRead) {
		if (story.id) {
			await kiteDB.markStoryAsRead(
				story.id,
				story.title,
				batchId,
				categoryUuid,
			);
		}
	} else {
		if (story.id) {
			await kiteDB.unmarkStoryAsRead(
				story.id,
				batchId,
				categoryUuid,
			);
		}
	}

	// After DB write, check if sequence changed - if so, a newer operation is in charge
	const latestSeq = toggleSequence.get(storyId);
	if (latestSeq !== currentSeq) {
		return;
	}
}

// Mark all as read
async function markAllAsRead() {
	displayedStories.forEach(async (story) => {
		if (!story.id) return; // Skip if no UUID
		const storyId = story.id; // Use UUID directly
		readStories[storyId] = true;
		// Persist to database
		if (story.id) {
			// Only mark if we have a UUID
			await kiteDB.markStoryAsRead(
				story.id, // cluster UUID
				story.title,
				batchId,
				categoryUuid,
			);
		}
	});
}

// Expand or collapse all stories
export function toggleExpandAll() {
	const expand = !allStoriesExpanded;

	// When collapsing, this is simple - just collapse all
	if (!expand) {
		expandedStories = {};
		return;
	}

	// Expand all at once
	const newExpanded: Record<string, boolean> = { ...expandedStories };
	displayedStories.forEach((story) => {
		const id = story.id || story.cluster_number?.toString() || story.title;
		newExpanded[id] = true;
	});
	expandedStories = newExpanded;
}

// Toggle read status by index (for keyboard navigation)
export function toggleReadStatus(index: number) {
	const story = displayedStories[index];
	if (story) {
		handleReadToggle(story);
	}
}

// Apply content filtering and story count limit
const { displayedStories, filteredCount, hiddenStories } = $derived.by(() => {
	// If in shared view mode, only show the specific shared article
	if (isSharedView) {
		let sharedStory: Story | undefined;

		console.log('🔍 [StoryList] Shared view mode - finding story:', {
			sharedArticleIndex,
			sharedClusterId,
			storiesCount: stories.length,
			expandedStories,
			firstStory: stories[0]?.title,
			firstCluster: stories[0]?.cluster_number
		});

		// First try to find by UUID from expandedStories (most reliable)
		const expandedStoryId = Object.keys(expandedStories).find((id) => expandedStories[id]);
		if (expandedStoryId) {
			sharedStory = stories.find(s => s.id === expandedStoryId || s.cluster_number?.toString() === expandedStoryId || s.title === expandedStoryId);
			console.log('🔍 [StoryList] Found by expandedStoryId:', expandedStoryId, '->', sharedStory?.title);
		}
		// Fall back to index (legacy format)
		else if (sharedArticleIndex !== null && stories[sharedArticleIndex]) {
			sharedStory = stories[sharedArticleIndex];
			console.log('🔍 [StoryList] Found by index:', sharedStory?.title);
		}
		// Fall back to clusterId (old format, unreliable in single page mode)
		else if (sharedClusterId !== null) {
			sharedStory = stories.find(s => s.cluster_number === sharedClusterId);
			console.log('🔍 [StoryList] Found by clusterId:', sharedClusterId, '->', sharedStory?.title);
		}

		if (sharedStory) {
			console.log('✅ [StoryList] Showing shared story:', sharedStory.title);
			return {
				displayedStories: [sharedStory] as FilteredStory[],
				filteredCount: 0,
				hiddenStories: stories.filter(s => s !== sharedStory),
			};
		} else {
			console.warn('❌ [StoryList] Shared story not found!');
		}
	}

	// First apply story count limit
	// In single page mode, stories are already limited per category in orderStoriesForSinglePage
	// So we skip the limit here to show all stories from all categories
	// Use override if provided (e.g., from URL navigation), otherwise use user setting
	const effectiveLimit = storyCountOverride ?? displaySettings.storyCount;
	const limitedStories = skipStoryCountLimit ? stories : stories.slice(0, effectiveLimit);

	// Then apply content filtering if active (has keywords)
	if (contentFilter.isActive) {
		const result = filterStories(
			limitedStories,
			contentFilter.keywords,
			contentFilter.filterScope,
			contentFilter.filterMode,
		);

		return {
			displayedStories: result.filtered as FilteredStory[],
			filteredCount: result.filteredCount,
			hiddenStories: result.hidden,
		};
	}

	return {
		displayedStories: limitedStories as FilteredStory[],
		filteredCount: 0,
		hiddenStories: [],
	};
});

// Check if all stories are read
const allStoriesRead = $derived(
	displayedStories.every((story) => story.id && readStories[story.id]),
);

// Check if all stories are expanded
const allStoriesExpanded = $derived(
	displayedStories.length > 0 &&
		displayedStories.every(
			(story) => expandedStories[story.cluster_number?.toString() || story.title],
		),
);
</script>

<div class="story-list">
  {#if displayedStories.length === 0}
    <div class="py-8 text-center text-gray-500 dark:text-gray-400">
      {#if contentFilter.isActive && filteredCount > 0 && contentFilter.filterMode === "hide"}
        <!-- All stories filtered message -->
        <p class="text-base font-medium mb-2">
          {s("contentFilter.allStoriesFiltered") ||
            "All stories in this category were filtered"}
        </p>
        <p class="text-sm mb-4">
          {s("contentFilter.allStoriesFilteredDescription") ||
            "Your content filters have hidden all stories in this category for today."}
        </p>
        <div class="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onclick={() => (window.location.href = "#settings/contentFilter")}
            class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {s("contentFilter.adjustFilters") || "Adjust filters"}
          </button>
          <button
            onclick={() => {
              // Only disable if we have more than one enabled category
              if (categorySettings.enabled.length > 1) {
                categorySettings.disableCategory(currentCategory);
                // Navigate to the first enabled category after disabling
                const firstEnabled = categorySettings.enabled[0];
                if (firstEnabled && firstEnabled !== currentCategory) {
                  window.location.href = `#${firstEnabled}`;
                } else {
                  // If current was the first, find the new first
                  const newEnabled = categorySettings.enabled.filter(cat => cat !== currentCategory);
                  if (newEnabled.length > 0) {
                    window.location.href = `#${newEnabled[0]}`;
                  }
                }
              } else {
                // If only one category is enabled, just navigate to settings
                window.location.href = "#settings/categories";
              }
            }}
            class="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {s("contentFilter.disableCategory") || "Disable category"}
          </button>
        </div>
      {:else}
        <p>
          {s("stories.noStories") || "No stories available for this category."}
        </p>
      {/if}
    </div>
  {:else}
    {#each displayedStories as story, index (story.id || story.cluster_number || story.title)}
      {@const isFiltered =
        contentFilter.filterMode === "blur" && story._filtered}
      {@const isLinkedStory = initiallyExpandedIndex === index}
      {@const isKeyboardSelected = keyboardNavigation.selectedIndex === index}
      {@const storyWithCategory = story as StoryWithCategory}
      {@const categoryId = storyWithCategory._categoryId || currentCategory}
      {@const categoryName = storyWithCategory._categoryName}
      {@const prevStoryWithCategory = index > 0 ? (displayedStories[index - 1] as StoryWithCategory) : null}
      {@const showCategoryHeader = showCategoryLabels && !isSharedView && categoryName && (index === 0 || categoryId !== prevStoryWithCategory?._categoryId)}

      <!-- Category Header for Single Page Mode -->
      {#if showCategoryHeader}
        <div class="mb-4 mt-8 first:mt-0">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
            {categoryName}
          </h2>
        </div>
      {/if}

      <StoryCard
        {story}
        storyIndex={index}
        {batchId}
        {batchDateSlug}
        {categoryId}
        isRead={(story.id && readStories[story.id]) ||
          false}
        isExpanded={expandedStories[
          story.id || story.cluster_number?.toString() || story.title
        ] || false}
        shouldAutoScroll={!allStoriesExpanded}
        onToggle={() => handleStoryToggle(story)}
        onReadToggle={() => handleReadToggle(story)}
        priority={index < 3}
        {isFiltered}
        filterKeywords={story._matchedKeywords}
        bind:showSourceOverlay
        bind:currentSource
        bind:sourceArticles
        bind:currentMediaInfo
        bind:isLoadingMediaInfo
        {isSharedView}
        {isLinkedStory}
        {isKeyboardSelected}
      />
    {/each}

    <!-- Filtered stories notification -->
    {#if contentFilter.isActive && filteredCount > 0 && contentFilter.showFilteredCount}
      <div class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          {#if contentFilter.filterMode === "hide"}
            {filteredCount === 1
              ? s("contentFilter.storyHidden", {
                  count: filteredCount.toString(),
                })
              : s("contentFilter.storiesHidden", {
                  count: filteredCount.toString(),
                })}
          {:else}
            {filteredCount === 1
              ? s("contentFilter.storyFiltered", {
                  count: filteredCount.toString(),
                })
              : s("contentFilter.storiesFiltered", {
                  count: filteredCount.toString(),
                })}
          {/if}
        </p>
      </div>
    {/if}

    <!-- Few stories message -->
    {#if displayedStories.length > 0 && displayedStories.length <= 3}
      <div class="mt-6 py-4 text-center text-gray-600 dark:text-gray-400">
        <p class="text-base">
          {s("stories.fewStories") || "There were no other significant news today, come back tomorrow!"}
        </p>
      </div>
    {/if}

    <!-- Mark all as read button -->
    {#if !allStoriesRead && displayedStories.length > 0}
      <div class="mt-6 w-full text-center">
        <button
          onclick={markAllAsRead}
          aria-label="Mark all {displayedStories.length} stories in {currentCategory} as read"
          class="w-full rounded-lg bg-gray-100 px-6 py-3 text-gray-800 transition-colors duration-200 hover:bg-gray-200 md:w-auto dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {s("article.markAllAsRead") || "Mark all as read"}
        </button>
      </div>
    {/if}
  {/if}
</div>
