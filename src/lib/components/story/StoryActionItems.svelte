<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';

// Props
interface Props {
	actionItems: Array<string>;
	articles?: Article[];
	citationMapping?: CitationMapping;
	storyLocalizer?: (key: string) => string;
}

let { actionItems, articles = [], citationMapping, storyLocalizer = s }: Props = $props();

// Convert citations to numbered format if mapping is available
const displayItems = $derived.by(() => {
	if (!citationMapping) return actionItems;
	return actionItems.map((item) => replaceWithNumberedCitations(item, citationMapping));
});
</script>

<section class="mt-6 rounded-lg bg-[#F1FAE8] p-4 dark:bg-[#2B411C]">
  <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
    {storyLocalizer("section.actionItems") || "Action Items"}
  </h3>
  <ul class="mb-2 ms-4 list-disc space-y-2 text-gray-700 dark:text-gray-200">
    {#each displayItems as item}
      {@const itemCitations = getCitedArticlesForText(
        item,
        citationMapping,
        articles,
      )}
      <li dir="auto">
        <CitationText
          text={item}
          showFavicons={false}
          showNumbers={false}
          inline={true}
          articles={itemCitations.citedArticles}
          {citationMapping}
          {storyLocalizer}
        />
      </li>
    {/each}
  </ul>
</section>
