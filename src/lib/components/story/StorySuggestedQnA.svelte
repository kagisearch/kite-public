<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article, LocalizerFunction } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	qna: Array<{
		question: string;
		answer: string;
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
	qna,
	articles = [],
	citationMapping,
	storyLocalizer = s,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
}: Props = $props();

// Convert citations in Q&A if mapping is available
const displayQna = $derived.by(() => {
	if (!citationMapping) return qna;
	return qna.map((qa) => ({
		question: replaceWithNumberedCitations(qa.question, citationMapping),
		answer: replaceWithNumberedCitations(qa.answer, citationMapping),
	}));
});
</script>

<section class="mt-6">
  <h3 class="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {storyLocalizer("section.suggestedQnA") || "Q&A"}
  </h3>

  <div class="space-y-4">
    {#each displayQna as qa}
      {@const questionCitations = getCitedArticlesForText(
        qa.question,
        citationMapping,
        articles,
      )}
      {@const answerCitations = getCitedArticlesForText(
        qa.answer,
        citationMapping,
        articles,
      )}
      <div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
        <p class="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">
          {#if flashcardMode}
            <SelectableText
              text={qa.question}
              {flashcardMode}
              {selectedWords}
              {selectedPhrases}
              {shouldJiggle}
              {onWordClick}
              section="suggested_qna"
            />
          {:else}
            <CitationText
              text={qa.question}
              showFavicons={false}
              showNumbers={false}
              inline={true}
              articles={questionCitations.citedArticles}
              {citationMapping}
              {storyLocalizer}
            />
          {/if}
        </p>
        <p class="text-base text-gray-700 dark:text-gray-300">
          {#if flashcardMode}
            <SelectableText
              text={qa.answer}
              {flashcardMode}
              {selectedWords}
              {selectedPhrases}
              {shouldJiggle}
              {onWordClick}
              section="suggested_qna"
            />
          {:else}
            <CitationText
              text={qa.answer}
              showFavicons={false}
              showNumbers={false}
              inline={false}
              articles={answerCitations.citedArticles}
              {citationMapping}
              {storyLocalizer}
            />
          {/if}
        </p>
      </div>
    {/each}
  </div>
</section>
