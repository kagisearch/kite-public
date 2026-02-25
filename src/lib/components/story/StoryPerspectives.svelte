<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article, LocalizerFunction } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { parseStructuredText } from '$lib/utils/textParsing';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	perspectives?: Array<{
		text: string;
		sources?: Array<{
			name: string;
			url: string;
		}>;
	}>;
	articles?: Article[];
	citationMapping?: CitationMapping;
	storyLocalizer?: LocalizerFunction;
	flashcardMode?: boolean;
	selectedWords?: Set<string>;
	selectedPhrases?: Map<string, { phrase: string; sections: Set<string> }>;
	shouldJiggle?: boolean;
	onWordClick?: (word: string, section?: string) => void;
}

let {
	perspectives = [],
	articles = [],
	citationMapping,
	storyLocalizer = s,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
}: Props = $props();

// Convert citations in perspectives if mapping is available
const displayPerspectives = $derived.by(() => {
	if (!citationMapping) return perspectives;
	return perspectives.map((p) => ({
		...p,
		text: replaceWithNumberedCitations(p.text, citationMapping),
	}));
});

// Helper function to detect if text contains citations
function hasCitations(text: string): boolean {
	if (!text) return false;
	// Match citations like [domain#position], [common], [1], [2], etc.
	const citationPattern = /\[([^\]]+)\]/g;
	return citationPattern.test(text);
}

// Touch handling for mobile
let isScrolling = $state(false);

function handleTouchStart() {
	isScrolling = true;
}

function handleTouchEnd() {
	setTimeout(() => {
		isScrolling = false;
	}, 50);
}

// Scroll indicator state
let scrollContainer = $state<HTMLDivElement | null>(null);
let canScrollLeft = $state(false);
let canScrollRight = $state(false);

function checkScrollability() {
	if (!scrollContainer) return;
	const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
	canScrollLeft = scrollLeft > 10;
	canScrollRight = scrollWidth - scrollLeft - clientWidth > 10;
}

function scrollBy(direction: 'left' | 'right') {
	if (!scrollContainer) return;
	// Get the actual card width + gap from the first card
	const firstCard = scrollContainer.querySelector(':scope > div') as HTMLElement;
	if (!firstCard) return;
	const cardWidth = firstCard.offsetWidth;
	const gap = 12; // gap-3 = 0.75rem = 12px
	const scrollAmount = cardWidth + gap;
	scrollContainer.scrollBy({
		left: direction === 'left' ? -scrollAmount : scrollAmount,
		behavior: 'smooth',
	});
}

$effect(() => {
	if (scrollContainer) {
		checkScrollability();
		// Also check on resize
		const resizeObserver = new ResizeObserver(checkScrollability);
		resizeObserver.observe(scrollContainer);
		return () => resizeObserver.disconnect();
	}
});
</script>

<section class="mt-6">
  <h3 class="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {storyLocalizer("section.perspectives") || "Perspectives"}
  </h3>
  <div class="relative">
    <div
      bind:this={scrollContainer}
      class="horizontal-scroll-container flex flex-row gap-3 overflow-x-auto pb-4"
      role="region"
      aria-label={storyLocalizer("section.perspectives.carousel") || "Perspectives carousel - use arrow keys or swipe to navigate"}
      ontouchstart={handleTouchStart}
      ontouchend={handleTouchEnd}
      onscroll={checkScrollability}
    >
    {#each displayPerspectives as perspective}
      {@const parsed = parseStructuredText(perspective.text)}
      <div
        class="w-52 flex-shrink-0 rounded-lg bg-gray-100 p-4 dark:bg-gray-700"
      >
        {#if parsed.hasTitle}
          {@const titleCitations = getCitedArticlesForText(
            parsed.title!,
            citationMapping,
            articles,
          )}
          {@const contentCitations = getCitedArticlesForText(
            parsed.content,
            citationMapping,
            articles,
          )}
          <p class="mb-2 text-base font-bold text-gray-800 dark:text-gray-200 break-words" dir="auto">
            {#if flashcardMode}
              <SelectableText
                text={parsed.title!}
                {flashcardMode}
                {selectedWords}
                {shouldJiggle}
                {onWordClick}
                section="perspectives"
              />
            {:else}
              <CitationText
                text={parsed.title!}
                showFavicons={false}
                showNumbers={false}
                inline={true}
                articles={titleCitations.citedArticles}
                {citationMapping}
                {storyLocalizer}
              />
            {/if}
          </p>
          <p class="mb-2 text-base text-gray-700 dark:text-gray-300" dir="auto">
            {#if flashcardMode}
              <SelectableText
                text={parsed.content}
                {flashcardMode}
                {selectedWords}
                {shouldJiggle}
                {onWordClick}
                section="perspectives"
              />
            {:else}
              <CitationText
                text={parsed.content}
                showFavicons={false}
                showNumbers={false}
                inline={true}
                articles={contentCitations.citedArticles}
                {citationMapping}
                {storyLocalizer}
              />
            {/if}
          </p>
        {:else}
          {@const contentCitations = getCitedArticlesForText(
            parsed.content,
            citationMapping,
            articles,
          )}
          <p class="mb-2 text-base text-gray-700 dark:text-gray-300" dir="auto">
            {#if flashcardMode}
              <SelectableText
                text={parsed.content}
                {flashcardMode}
                {selectedWords}
                {shouldJiggle}
                {onWordClick}
                section="perspectives"
              />
            {:else}
              <CitationText
                text={parsed.content}
                showFavicons={false}
                showNumbers={false}
                inline={true}
                articles={contentCitations.citedArticles}
                {citationMapping}
                {storyLocalizer}
              />
            {/if}
          </p>
        {/if}

        {#if perspective.sources && perspective.sources.length > 0 && !hasCitations(perspective.text)}
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {#each perspective.sources as source, idx}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#183FDC] hover:underline dark:text-[#5B89FF]"
                dir="auto"
              >
                {source.name}
              </a>
              {#if idx < perspective.sources.length - 1}
                <span> • </span>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
    </div>
    <!-- Left scroll button -->
    {#if canScrollLeft}
      <button
        onclick={() => scrollBy('left')}
        class="absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 transition-opacity"
        aria-label="Scroll left"
      >
        <svg class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    {/if}
    <!-- Right scroll button -->
    {#if canScrollRight}
      <button
        onclick={() => scrollBy('right')}
        class="absolute right-0 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 transition-opacity"
        aria-label="Scroll right"
      >
        <svg class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    {/if}
    <!-- Scroll indicator fade (mobile) -->
    {#if canScrollRight}
      <div
        class="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent dark:from-gray-900 md:hidden"
        aria-hidden="true"
      ></div>
    {/if}
  </div>
</section>
