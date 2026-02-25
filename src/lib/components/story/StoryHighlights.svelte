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
	points?: string[];
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
	points = [],
	articles = [],
	citationMapping,
	storyLocalizer = s,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
}: Props = $props();

// Convert citations to numbered format if mapping is available
const displayPoints = $derived.by(() => {
	if (!citationMapping) return points;
	return points.map((point) => replaceWithNumberedCitations(point, citationMapping));
});
</script>

<section class="mt-6">
  <h3 class="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {storyLocalizer("section.highlights") || "Key Points"}
  </h3>
  <ol class="border-t border-dashed border-gray-300 dark:border-gray-600" role="list" aria-label="Key highlights">
    {#each displayPoints as point, index}
      {@const parsed = parseStructuredText(point)}
      <li
        class="relative border-b border-dashed border-gray-300 py-4 ps-10 dark:border-gray-600"
        role="listitem"
        aria-setsize={displayPoints.length}
        aria-posinset={index + 1}
      >
        <div class="absolute top-4 start-0" aria-hidden="true">
          <div
            class="flex h-6 w-6 items-center justify-center rounded-full bg-[#F9D9B8]"
          >
            <span class="text-sm font-semibold text-gray-800">{index + 1}</span>
          </div>
        </div>
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
          <div>
            <h4 class="mb-2 font-semibold text-gray-800 dark:text-gray-200" dir="auto">
              {#if flashcardMode}
                <SelectableText
                  text={parsed.title!}
                  {flashcardMode}
                  {selectedWords}
                  {selectedPhrases}
                  {shouldJiggle}
                  {onWordClick}
                  section="talking_points"
                />
              {:else}
                <CitationText
                  text={parsed.title!}
                  articles={titleCitations.citedArticles}
                  {citationMapping}
                  {storyLocalizer}
                />
              {/if}
            </h4>
            <p
              class="-ms-10 text-gray-700 dark:text-gray-300 first-letter-capitalize"
              dir="auto"
            >
              {#if flashcardMode}
                <SelectableText
                  text={parsed.content}
                  {flashcardMode}
                  {selectedWords}
                  {selectedPhrases}
                  {shouldJiggle}
                  {onWordClick}
                  section="talking_points"
                />
              {:else}
                <CitationText
                  text={parsed.content}
                  articles={contentCitations.citedArticles}
                  {citationMapping}
                  {storyLocalizer}
                />
              {/if}
            </p>
          </div>
        {:else}
          {@const contentCitations = getCitedArticlesForText(
            parsed.content,
            citationMapping,
            articles,
          )}
          <p class="text-base text-gray-700 dark:text-gray-300 first-letter-capitalize" dir="auto">
            {#if flashcardMode}
              <SelectableText
                text={parsed.content}
                {flashcardMode}
                {selectedWords}
                {selectedPhrases}
                {shouldJiggle}
                {onWordClick}
                section="talking_points"
              />
            {:else}
              <CitationText
                text={parsed.content}
                articles={contentCitations.citedArticles}
                {citationMapping}
                {storyLocalizer}
              />
            {/if}
          </p>
        {/if}
      </li>
    {/each}
  </ol>
</section>

<style>
  :global(.first-letter-capitalize::first-letter) {
    text-transform: uppercase;
  }
</style>
