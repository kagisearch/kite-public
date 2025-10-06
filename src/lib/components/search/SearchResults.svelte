<script lang="ts">
import {
	IconBolt,
	IconCalendar,
	IconClock,
	IconLoader2,
	IconSearch,
	IconTag,
	IconX,
} from '@tabler/icons-svelte';
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { features } from '$lib/config/features';
import type { SearchResult } from '$lib/services/search';
import 'overlayscrollbars/overlayscrollbars.css';
import { slide } from 'svelte/transition';

interface Props {
	results: SearchResult[];
	selectedIndex: number;
	isLoading: boolean;
	isSearchingHistorical: boolean;
	isLoadingMore?: boolean;
	hasMore?: boolean;
	query: string;
	totalCount: number;
	localCount?: number;
	historicalCount?: number;
	onSelectResult: (result: SearchResult) => void;
	onLoadMore?: () => void;
}

let {
	results,
	selectedIndex,
	isLoading,
	isSearchingHistorical,
	isLoadingMore = false,
	hasMore = false,
	query,
	totalCount,
	localCount = 0,
	historicalCount = 0,
	onSelectResult,
	onLoadMore,
}: Props = $props();

let resultsContainer = $state<HTMLDivElement | null>(null);
let lastSelectedIndex = $state(0);
let currentFilterTip = $state(0);
let showFilterTips = $state(true);
let autoRotate = $state(true);
let animateTransition = $state(false);

// Check localStorage for filter tips preference (only if feature is enabled)
$effect(() => {
	if (browser && features.historicalSearch) {
		const hidden = localStorage.getItem('hideSearchFilterTips');
		showFilterTips = hidden !== 'true';
	} else {
		showFilterTips = false;
	}
});

function dismissFilterTips() {
	animateTransition = true;
	showFilterTips = false;
	if (browser) {
		localStorage.setItem('hideSearchFilterTips', 'true');
	}
}

function selectFilterTip(index: number) {
	currentFilterTip = index;
	autoRotate = false; // Stop auto-rotation when user manually selects
}

// Filter tips data
const filterTips = [
	{
		icon: IconTag,
		color: 'text-blue-500 dark:text-blue-400',
		title: 'category:',
		hint: 'search.filter_category_hint',
		defaultHint: 'Filter by news category (e.g., category:Technology)',
	},
	{
		icon: IconCalendar,
		color: 'text-green-500 dark:text-green-400',
		title: 'from: / to:',
		hint: 'search.filter_date_hint',
		defaultHint: 'Search within a date range (e.g., from:2025-01-01 to:today)',
	},
	{
		icon: IconBolt,
		color: 'text-purple-500 dark:text-purple-400',
		title: s('search.shortcuts_title') || 'Quick shortcuts',
		hint: 'search.shortcuts_hint',
		defaultHint: 'Type "cat" for categories, dates like "yesterday" or "last week"',
	},
];

// Rotate filter tips every 3 seconds (only if auto-rotate is enabled)
$effect(() => {
	if (!query && results.length === 0 && showFilterTips && autoRotate) {
		const interval = setInterval(() => {
			currentFilterTip = (currentFilterTip + 1) % filterTips.length;
		}, 3000);

		return () => clearInterval(interval);
	}
});

// Reset auto-rotate when modal reopens (detected by query being empty)
$effect(() => {
	if (!query && results.length === 0) {
		autoRotate = true;
	}
});

// OverlayScrollbars setup
const [initialize] = useOverlayScrollbars({
	defer: true,
	options: {
		scrollbars: {
			autoHide: 'scroll',
			theme: 'os-theme-dark os-theme-light',
		},
	},
});

// Initialize OverlayScrollbars on the results container
$effect(() => {
	if (resultsContainer) {
		initialize(resultsContainer);
	}
});

// Auto-scroll when selection changes
$effect(() => {
	if (selectedIndex >= 0) {
		scrollToSelected();
	}
});

// Scroll selected result into view, keeping one extra item visible in scroll direction
export function scrollToSelected() {
	if (resultsContainer && results.length > 0) {
		const buttons = resultsContainer.querySelectorAll('button');

		// Determine scroll direction
		const scrollingDown = selectedIndex > lastSelectedIndex;
		const scrollingUp = selectedIndex < lastSelectedIndex;

		// Determine which element to scroll to
		let targetIndex = selectedIndex;

		// When scrolling down, ensure the next item is visible
		if (scrollingDown && selectedIndex < buttons.length - 1) {
			targetIndex = selectedIndex + 1;
		}
		// When scrolling up, ensure the previous item is visible
		else if (scrollingUp && selectedIndex > 0) {
			targetIndex = selectedIndex - 1;
		}

		// Scroll the target element into view
		const targetElement = buttons[targetIndex] as HTMLElement;
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: 'instant', block: 'nearest' });
		}

		// Update last index
		lastSelectedIndex = selectedIndex;
	}
}

function handleResultClick(result: SearchResult) {
	onSelectResult(result);
}

function handleResultKeyDown(event: KeyboardEvent, result: SearchResult) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		onSelectResult(result);
	}
}

// Check if a date is today
function isToday(dateString: string): boolean {
	const date = new Date(dateString);
	const today = new Date();
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	);
}

// Highlight search query matches in text
function highlightMatch(text: string, query: string): string {
	if (!query || !text) return text;

	// Simple case-insensitive string matching without regex
	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();

	let result = '';
	let lastIndex = 0;
	let index = lowerText.indexOf(lowerQuery);

	while (index !== -1) {
		// Add text before match
		result += text.slice(lastIndex, index);
		// Add highlighted match
		result +=
			'<mark class="bg-yellow-200 dark:bg-yellow-800">' +
			text.slice(index, index + query.length) +
			'</mark>';
		lastIndex = index + query.length;
		index = lowerText.indexOf(lowerQuery, lastIndex);
	}

	// Add remaining text
	result += text.slice(lastIndex);

	return result;
}

// Remove citation markers from text
function removeCitations(text: string): string {
	if (!text) return text;
	return text
		.replace(/\[[^\]]+\]/g, '') // Remove anything in square brackets
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim();
}

// Create highlighted snippet
function getSnippetWithHighlight(text: string, query: string, maxLength: number = 150): string {
	const cleanText = removeCitations(text);

	if (!query) {
		return cleanText.slice(0, maxLength) + (cleanText.length > maxLength ? '...' : '');
	}

	const lowerText = cleanText.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const queryIndex = lowerText.indexOf(lowerQuery);

	let snippet = '';

	if (queryIndex === -1) {
		// No match, just return beginning
		snippet = cleanText.slice(0, maxLength);
	} else {
		// Found match, center around it
		let start = Math.max(0, queryIndex - 50);
		let end = Math.min(cleanText.length, queryIndex + query.length + 100);

		// Adjust to word boundaries
		if (start > 0) {
			const spaceIndex = cleanText.indexOf(' ', start);
			if (spaceIndex > 0 && spaceIndex < start + 20) start = spaceIndex;
		}

		if (end < cleanText.length) {
			const spaceIndex = cleanText.indexOf(' ', end);
			if (spaceIndex > 0 && spaceIndex < end + 20) end = spaceIndex;
		}

		snippet = cleanText.slice(start, end);

		// Add ellipsis
		if (start > 0) snippet = `...${snippet}`;
		if (end < cleanText.length) snippet = `${snippet}...`;
	}

	// Highlight the match
	return highlightMatch(snippet, query);
}
</script>

<div class="flex-1 overflow-hidden flex flex-col">
  <!-- Results Header -->
  <div
    class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
  >
    <div class="flex items-center justify-between h-6">
      <div class="flex-1">
        {#if isLoading}
          <div
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <IconLoader2 class="w-4 h-4 text-blue-500 animate-spin" />
            {s("search.searching") || "Searching..."}
          </div>
        {:else if results.length > 0}
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {#if totalCount > results.length}
              {s("search.showing") || "Showing"}
              {results.length}
              {s("search.of") || "of"}
              {totalCount}
              {totalCount === 1
                ? s("search.result_single") || "result"
                : s("search.result_plural") || "results"}
            {:else}
              {results.length}
              {results.length === 1
                ? s("search.result_single") || "result"
                : s("search.result_plural") || "results"}
            {/if}
            {#if query}
              {s("search.for") || "for"}
              <span class="font-medium">"{query}"</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Historical Search Status (only shown if feature is enabled) -->
      {#if features.historicalSearch}
        {#if query.length > 0 && query.length < 3}
          <div class="text-xs text-amber-600 dark:text-amber-400">
            {s("search.historical_needs_3_chars") ||
              "Historical search needs 3+ characters"}
          </div>
        {:else if isSearchingHistorical}
          <div
            class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
          >
            <IconLoader2 class="w-3 h-3 text-yellow-500 animate-spin" />
            {s("search.searching_historical") || "Searching historical..."}
          </div>
        {:else if historicalCount > 0}
          <div
            class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
          >
            <IconClock size={12} />
            {s("search.historical_included", {
              count: String(historicalCount),
            }) || `${historicalCount} historical results included`}
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Results List -->
  <div
    bind:this={resultsContainer}
    class="flex-1 min-h-0"
    data-overlayscrollbars-initialize
  >
    {#if !query && results.length === 0}
      <!-- Empty state - show filter suggestions -->
      <div class="flex items-center justify-center min-h-full p-8">
        <div class="w-full max-w-md">
          <div class="text-center mb-6">
            <img
              src="/doggo_default.svg"
              alt="Search mascot"
              class="w-40 h-40 mx-auto mb-4 transition-all duration-300"
            />
            <h3
              class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2"
            >
              {s("search.get_started_title") || "Start searching"}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {s("search.get_started_description") ||
                "Type to search or use filters"}
            </p>
          </div>

          {#if showFilterTips}
            <div
              transition:slide|local={{
                duration: animateTransition ? 300 : 0,
                axis: "y",
              }}
            >
              <div class="flex items-center justify-between mb-3">
                <div
                  class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {s("search.try_these") || "Try these filters"}
                </div>
                <button
                  onclick={dismissFilterTips}
                  class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  aria-label="Dismiss filter tips"
                  title={s("search.dismiss_tips") ||
                    "Don't show these tips again"}
                >
                  <IconX size={14} />
                </button>
              </div>

              <!-- Rotating filter tip carousel -->
              <div class="relative h-20 overflow-hidden">
                {#each filterTips as tip, index}
                  {@const Icon = tip.icon}
                  <div
                    class="absolute inset-0 flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 transition-all duration-500 {index ===
                    currentFilterTip
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'}"
                    style="display: {index === currentFilterTip
                      ? 'flex'
                      : 'none'}"
                  >
                    <div class="{tip.color} mt-0.5">
                      <Icon size={16} />
                    </div>
                    <div class="flex-1">
                      <div
                        class="font-medium text-sm text-gray-900 dark:text-gray-100"
                      >
                        {tip.title}
                      </div>
                      <div
                        class="text-xs text-gray-600 dark:text-gray-400 mt-1"
                      >
                        {s(tip.hint) || tip.defaultHint}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Progress indicator with fill animation -->
              <div class="flex justify-center gap-1.5 mt-3">
                {#each filterTips as _, index}
                  <button
                    class="relative rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden transition-all duration-300 {index ===
                    currentFilterTip
                      ? 'w-8 h-1.5'
                      : 'w-1.5 h-1.5'}"
                    onclick={() => selectFilterTip(index)}
                    aria-label="Go to tip {index + 1}"
                  >
                    {#if index === currentFilterTip && autoRotate}
                      <div
                        class="absolute inset-0 bg-gray-600 dark:bg-gray-300 rounded-full animate-fill-progress"
                      ></div>
                    {:else if index === currentFilterTip}
                      <div
                        class="absolute inset-0 bg-gray-600 dark:bg-gray-300 rounded-full"
                      ></div>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else if results.length > 0}
      {#each results as result, index}
        <button
          class="w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:bg-gray-50 dark:focus:bg-gray-800/50 focus:outline-none {index ===
          selectedIndex
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
            : ''}"
          onclick={() => handleResultClick(result)}
          onkeydown={(e) => handleResultKeyDown(e, result)}
          tabindex={index === selectedIndex ? 0 : -1}
          type="button"
        >
          <div class="flex flex-col gap-2">
            <!-- Title and Category -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-2 flex-1">
                {#if result.story.emoji}
                  <span class="text-lg mt-0.5">{result.story.emoji}</span>
                {/if}
                <h3
                  class="font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1"
                  dir="auto"
                >
                  {@html highlightMatch(result.story.title || "", query)}
                </h3>
              </div>
              <span
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shrink-0"
                dir="auto"
              >
                {result.categoryName}
              </span>
            </div>

            <!-- Summary/Snippet -->
            {#if result.story.snippet}
              <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2" dir="auto">
                {@html getSnippetWithHighlight(result.story.snippet, query)}
              </p>
            {:else if result.story.short_summary}
              <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2" dir="auto">
                {@html getSnippetWithHighlight(
                  result.story.short_summary,
                  query,
                )}
              </p>
            {/if}

            <!-- Metadata -->
            <div
              class="flex items-center text-xs text-gray-500 dark:text-gray-400"
            >
              {#if result.story.location}
                <span dir="auto">📍 {result.story.location}</span>
                {#if result.story.unique_domains || (result.batchDate && !isToday(result.batchDate))}
                  <span class="mx-2">•</span>
                {/if}
              {/if}

              {#if result.story.unique_domains}
                <span
                  >{result.story.unique_domains}
                  {result.story.unique_domains === 1
                    ? s("search.source_single") || "source"
                    : s("search.source_plural") || "sources"}</span
                >
                {#if result.batchDate && !isToday(result.batchDate)}
                  <span class="mx-2">•</span>
                {/if}
              {/if}

              <!-- Date (only show if not today for current results) -->
              {#if result.batchDate && !isToday(result.batchDate)}
                <span>{new Date(result.batchDate).toLocaleDateString()}</span>
              {/if}
            </div>
          </div>
        </button>
      {/each}

      <!-- Load More Button (only shown if historical search is enabled) -->
      {#if features.historicalSearch && hasMore && onLoadMore}
        <div
          class="p-4 text-center bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"
        >
          {#if isLoadingMore}
            <div
              class="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <IconLoader2 class="w-4 h-4 text-blue-500 animate-spin" />
              {s("search.loading_more") || "Loading more results..."}
            </div>
          {:else}
            <button
              onclick={onLoadMore}
              class="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              {s("search.load_more") || "Load more results"}
            </button>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {s("search.showing_of", {
                shown: results.length.toString(),
                total: totalCount.toString(),
              }) || `Showing ${results.length} of ${totalCount} results`}
            </div>
          {/if}
        </div>
      {/if}
    {:else if !isLoading}
      <!-- Empty State -->
      <div class="flex items-center justify-center min-h-full p-8">
        <div class="text-center">
          <div
            class="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-4 flex items-center justify-center"
          >
            <IconSearch size={48} stroke={1.5} />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {s("search.no_results_title") || "No results found"}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
            {#if features.historicalSearch}
              {s("search.no_results_description") ||
                "Try adjusting your search terms or filters to find what you're looking for."}
            {:else}
              {s("search.no_results_description_simple") ||
                "Try different search terms to find what you're looking for."}
            {/if}
          </p>
          {#if features.historicalSearch}
            <div class="text-sm text-gray-400 dark:text-gray-500 space-y-1">
              <p>{s("search.try_searching_for") || "Try searching for:"}</p>
              <div class="flex flex-wrap gap-2 justify-center">
                <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >category:World</code
                >
                <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >from:yesterday</code
                >
                <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >to:today</code
                >
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @keyframes fill-progress {
    from {
      transform: scaleX(0);
      transform-origin: left;
    }
    to {
      transform: scaleX(1);
      transform-origin: left;
    }
  }

  .animate-fill-progress {
    animation: fill-progress 3s linear;
  }
</style>
