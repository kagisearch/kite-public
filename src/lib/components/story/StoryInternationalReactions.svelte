<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { parseStructuredText } from '$lib/utils/textParsing';
import CitationText from './CitationText.svelte';

// Props
interface Props {
	reactions: Array<string>;
	articles?: Article[];
	citationMapping?: CitationMapping;
	storyLocalizer?: (key: string) => string;
}

let { reactions, articles = [], citationMapping, storyLocalizer = s }: Props = $props();

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
      <div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
        {#if parsedReaction.country}
          <h4 class="font-semibold text-gray-800 dark:text-gray-200">
            {parsedReaction.country}
          </h4>
          <p class="text-base text-gray-700 dark:text-gray-300" dir="auto">
            <CitationText
              text={parsedReaction.response}
              showFavicons={false}
              showNumbers={false}
              inline={true}
              articles={responseCitations.citedArticles}
              {citationMapping}
              {storyLocalizer}
            />
          </p>
        {:else}
          <p class="text-base text-gray-700 dark:text-gray-300" dir="auto">
            <CitationText
              text={parsedReaction.response}
              showFavicons={false}
              showNumbers={false}
              inline={true}
              articles={responseCitations.citedArticles}
              {citationMapping}
              {storyLocalizer}
            />
          </p>
        {/if}
      </div>
    {/each}
  </div>
</section>
