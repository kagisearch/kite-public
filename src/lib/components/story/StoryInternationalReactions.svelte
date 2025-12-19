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
	reactions: Array<string>;
	articles?: Article[];
	citationMapping?: CitationMapping;
	storyLocalizer?: LocalizerFunction;
	flashcardMode?: boolean;
	selectedWords?: Set<string>;
	selectedPhrases?: Map<string, { phrase: string; sections: Set<string> }>;
	shouldJiggle?: boolean;
	onWordClick?: (word: string, section?: string) => void;
}

let { reactions, articles = [], citationMapping, storyLocalizer = s, flashcardMode = false, selectedWords = new Set(), selectedPhrases = new Map(), shouldJiggle = false, onWordClick }: Props = $props();

// Convert citations in reactions if mapping is available
const displayReactions = $derived.by(() => {
	if (!citationMapping) return reactions;
	return reactions.map((r) => replaceWithNumberedCitations(r, citationMapping));
});

// Parse reaction text using structured text utility
function parseReaction(reaction: string) {
	const parsed = parseStructuredText(reaction);
	let country = parsed.hasTitle ? parsed.title! : '';
	let response = parsed.content;

	// Ensure response ends with period
	if (!response.endsWith('.')) {
		response += '.';
	}

	return { country, response };
}
</script>

<section class="mt-6">
  <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {storyLocalizer("section.internationalReactions") || "International Reactions"}
  </h3>
  <div class="space-y-2">
    {#each displayReactions as reaction}
      {@const parsedReaction = parseReaction(reaction)}
      {@const responseCitations = getCitedArticlesForText(
        parsedReaction.response,
        citationMapping,
        articles,
      )}
      <article class="rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
        {#if parsedReaction.country}
          <h4 class="font-semibold text-gray-800 dark:text-gray-200">
            {parsedReaction.country}
          </h4>
          <p class="text-base text-gray-700 dark:text-gray-300" dir="auto">
            {#if flashcardMode}
              <SelectableText
                text={parsedReaction.response}
                {flashcardMode}
                {selectedWords}
                {selectedPhrases}
                {shouldJiggle}
                {onWordClick}
                section="international_reactions"
              />
            {:else}
              <CitationText
                text={parsedReaction.response}
                showFavicons={false}
                showNumbers={false}
                inline={true}
                articles={responseCitations.citedArticles}
                {citationMapping}
                {storyLocalizer}
              />
            {/if}
          </p>
        {:else}
          <p class="text-base text-gray-700 dark:text-gray-300" dir="auto">
            {#if flashcardMode}
              <SelectableText
                text={parsedReaction.response}
                {flashcardMode}
                {selectedWords}
                {selectedPhrases}
                {shouldJiggle}
                {onWordClick}
                section="international_reactions"
              />
            {:else}
              <CitationText
                text={parsedReaction.response}
                showFavicons={false}
                showNumbers={false}
                inline={true}
                articles={responseCitations.citedArticles}
                {citationMapping}
                {storyLocalizer}
              />
            {/if}
          </p>
        {/if}
      </article>
    {/each}
  </div>
</section>
