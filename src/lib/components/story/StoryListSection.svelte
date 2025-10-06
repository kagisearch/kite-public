<script lang="ts">
import type { Article } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';

// Props
interface Props {
	title: string;
	items?: Array<string>;
	showAsList?: boolean;
	articles?: Article[];
	citationMapping?: CitationMapping;
}

let { title, items = [], showAsList = true, articles = [], citationMapping }: Props = $props();

// Convert citations to numbered format if mapping is available
const displayItems = $derived.by(() => {
	if (!citationMapping) return items;
	return items.map((item) => replaceWithNumberedCitations(item, citationMapping));
});
</script>

<section class="mt-6">
  <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {title}
  </h3>
  {#if showAsList}
    <ul
      class="mb-4 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300"
    >
      {#each displayItems as item}
        {@const itemCitations = getCitedArticlesForText(
          item,
          citationMapping,
          articles,
        )}
        <li>
          <CitationText
            text={item}
            showFavicons={false}
            showNumbers={false}
            inline={true}
            articles={itemCitations.citedArticles}
            {citationMapping}
          />
        </li>
      {/each}
    </ul>
  {:else}
    <div class="mb-4 space-y-2 text-base text-gray-700 dark:text-gray-300">
      {#each displayItems as item}
        {@const itemCitations = getCitedArticlesForText(
          item,
          citationMapping,
          articles,
        )}
        <CitationText
          text={item}
          showFavicons={false}
          showNumbers={false}
          inline={false}
          articles={itemCitations.citedArticles}
          {citationMapping}
        />
      {/each}
    </div>
  {/if}
</section>
