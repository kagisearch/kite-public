<script lang="ts">
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { createStoryLocalizer } from '$lib/client/storyLocalization.svelte';
import { useHoverPreloading, useViewportPreloading } from '$lib/hooks/useImagePreloading.svelte';
import StoryActions from './StoryActions.svelte';
import StoryHeader from './StoryHeader.svelte';
import StorySectionManager from './StorySectionManager.svelte';

// Props
interface Props {
	story: any;
	storyIndex?: number;
	batchId?: string;
	categoryId?: string;
	isRead?: boolean;
	isExpanded?: boolean;
	onToggle?: () => void;
	onReadToggle?: () => void;
	showSourceOverlay?: boolean;
	currentSource?: any;
	sourceArticles?: any[];
	currentMediaInfo?: any;
	isLoadingMediaInfo?: boolean;
	priority?: boolean; // For high-priority stories (first few visible)
	isFiltered?: boolean;
	filterKeywords?: string[];
	shouldAutoScroll?: boolean;
	isSharedView?: boolean;
	isLinkedStory?: boolean; // Story opened from URL/link
}

let {
	story,
	storyIndex,
	batchId,
	categoryId,
	isRead = false,
	isExpanded = false,
	shouldAutoScroll = false,
	onToggle,
	onReadToggle,
	showSourceOverlay = $bindable(false),
	currentSource = $bindable(null),
	sourceArticles = $bindable([]),
	currentMediaInfo = $bindable(null),
	isLoadingMediaInfo = $bindable(false),
	priority = false,
	isFiltered = false,
	filterKeywords = [],
	isSharedView = false,
	isLinkedStory = false,
}: Props = $props();

// Story element reference
let storyElement: HTMLElement;

// Blur state - re-check filtering in real-time
let isBlurred = $state(isFiltered);
// Track if we're actively revealing (for transition)
let isRevealing = $state(false);

// Create story-specific localization function
// Pass the story's actual source language when available
const ss = $derived(createStoryLocalizer(isExpanded, story.sourceLanguage));

// Re-check if story should still be blurred when filter changes
$effect(() => {
	// Reset blur state to match current filter state
	isBlurred = isFiltered;
	// Reset revealing state when filter changes
	isRevealing = false;
});

// Use hooks for preloading
const viewportPreloader = useViewportPreloading(() => storyElement, story, {
	priority,
});

const hoverPreloader = useHoverPreloading(story, { priority });

// Track if images are preloaded
const imagesPreloaded = $derived(viewportPreloader.isPreloaded || hoverPreloader.isPreloaded);

// Handle story click
function handleStoryClick() {
	// In shared view mode, don't allow toggling/closing
	if (isSharedView) return;

	// If blurred, reveal
	if (isBlurred) {
		isRevealing = true;
		isBlurred = false;
		// If story is not yet expanded, expand it after a small delay
		if (!isExpanded) {
			setTimeout(() => {
				if (onToggle) onToggle();
			}, 100);
		}
		// Reset revealing state after animation completes
		setTimeout(() => {
			isRevealing = false;
		}, 300);
		return;
	}
	if (onToggle) onToggle();
}

// Handle read toggle click
function handleReadClick(e: Event) {
	e.stopPropagation();
	if (onReadToggle) onReadToggle();
}

// Scroll to story when expanded
$effect(() => {
	if (isExpanded && browser && storyElement && shouldAutoScroll) {
		// Small delay to ensure the content is rendered
		setTimeout(() => {
			// Calculate dynamic header height and offsets
			const headerEl = document.querySelector('header') || document.querySelector('nav');
			const headerHeight = headerEl ? headerEl.offsetHeight : 60;

			// Mobile vs desktop offsets - smaller offset for more precise positioning
			const isMobile = window.innerWidth <= 768;
			const extraOffset = isMobile ? 8 : 12;

			// Find the category element within this story for precise positioning
			const categoryElement = storyElement.querySelector('.category-label');

			let rect: DOMRect;
			let elementTop: number;

			if (categoryElement) {
				// Use the category element directly for most precise positioning
				rect = categoryElement.getBoundingClientRect();
				elementTop = window.pageYOffset + rect.top - 28;
			} else throw new Error('Category element not found');

			// Calculate the ideal scroll position to show the category nicely below the header
			const idealScrollPosition = elementTop - headerHeight - extraOffset;

			// Check if the category is properly positioned below the header
			const requiredMargin = headerHeight + extraOffset;
			const isProperlyVisible = rect.top >= requiredMargin && rect.top <= requiredMargin + 20;

			// Only scroll if not properly positioned
			if (!isProperlyVisible) {
				const finalScrollPosition = Math.max(0, idealScrollPosition);

				window.scrollTo({
					top: finalScrollPosition,
					behavior: 'smooth',
				});
			}
		}, 150);
	}
});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<article
  bind:this={storyElement}
  id="story-{story.cluster_number}"
  data-story-id={story.cluster_number?.toString() || story.title}
  aria-label="News story: {story.title}"
  class="relative py-2 transition-all duration-300"
  class:cursor-pointer={isBlurred}
  class:border-b={!isExpanded}
  class:border-gray-200={!isExpanded}
  class:dark:border-gray-700={!isExpanded}
  onmouseenter={hoverPreloader.handleMouseEnter}
  onmouseleave={hoverPreloader.handleMouseLeave}
  onfocus={hoverPreloader.handleMouseEnter}
  onclick={isBlurred ? handleStoryClick : undefined}
  onkeydown={isBlurred ? (e) => e.key === "Enter" && handleStoryClick() : undefined}
  role={isBlurred ? "button" : undefined}
  tabindex={isBlurred ? 0 : undefined}
>
  <!-- Blurrable Content -->
  <div class:transition-all={isRevealing} class:duration-300={isRevealing} class:blur-lg={isBlurred} class:pointer-events-none={isBlurred}>
    <!-- Story Header -->
    <StoryHeader
      {story}
      {isRead}
      onTitleClick={handleStoryClick}
      onReadClick={handleReadClick}
    />

    <!-- Expanded Content -->
    {#if isExpanded}
      <div
        class="dark:bg-dark-bg flex flex-col bg-white py-4"
        role="region"
        aria-label="Story content"
      >
        <!-- Dynamic Sections based on user settings -->
        <StorySectionManager
          {story}
          {imagesPreloaded}
          bind:showSourceOverlay
          bind:currentSource
          bind:sourceArticles
          bind:currentMediaInfo
          bind:isLoadingMediaInfo
          storyLocalizer={ss}
        />

        <!-- Action Buttons -->
        <StoryActions
          {story}
          {batchId}
          {categoryId}
          {storyIndex}
          onClose={handleStoryClick}
          {isSharedView}
          storyLocalizer={ss}
        />
      </div>
    {/if}
  </div>

  <!-- Blur Warning Overlay -->
  {#if isBlurred && filterKeywords && filterKeywords.length > 0}
    <div
      class="absolute left-0 top-4 z-10 flex items-center gap-3 px-4"
    >
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {isLinkedStory
          ? (s("contentFilter.linkedStoryFilteredBecause") || "The story you wanted to view is blocked by your content filter:")
          : (s("contentFilter.filteredBecause") || "Hidden due to filter:")}
      </span>
      <div class="flex items-center gap-2">
        {#each filterKeywords.slice(0, 3) as keyword}
          <span
            class="text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded"
          >
            {keyword}
          </span>
        {/each}
        {#if filterKeywords.length > 3}
          <span class="text-xs text-gray-600 dark:text-gray-400">
            +{filterKeywords.length - 3}
          </span>
        {/if}
      </div>
      <span class="text-xs text-gray-600 dark:text-gray-400 italic">
        {isLinkedStory
          ? (s("contentFilter.linkedStoryClickToReveal") || "Click to show anyway")
          : (s("contentFilter.clickToReveal") || "Click to show")}
      </span>
    </div>
  {/if}
</article>
