<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';

// Props
interface Props {
	qna: Array<{
		question: string;
		answer: string;
	}>;
	articles?: Article[];
	citationMapping?: CitationMapping;
	storyLocalizer?: (key: string) => string;
}

let { qna, articles = [], citationMapping, storyLocalizer = s }: Props = $props();

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
          <CitationText
            text={qa.question}
            showFavicons={false}
            showNumbers={false}
            inline={true}
            articles={questionCitations.citedArticles}
            {citationMapping}
            {storyLocalizer}
          />
        </p>
        <p class="text-base text-gray-700 dark:text-gray-300">
          <CitationText
            text={qa.answer}
            showFavicons={false}
            showNumbers={false}
            inline={false}
            articles={answerCitations.citedArticles}
            {citationMapping}
            {storyLocalizer}
          />
        </p>
      </div>
    {/each}
  </div>
</section>
