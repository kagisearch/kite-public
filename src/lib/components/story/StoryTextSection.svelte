<script lang="ts">
import type { Article } from '$lib/types';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';

// Props
interface Props {
	title: string;
	content: string;
	articles?: Article[];
	citationMapping?: CitationMapping;
}

let { title, content, articles = [], citationMapping }: Props = $props();

// Convert citations to numbered format if mapping is available
const displayContent = $derived.by(() => {
	if (!citationMapping) return content;
	return replaceWithNumberedCitations(content, citationMapping);
});
</script>

<section class="mt-6">
  <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {title}
  </h3>
  <div class="mb-4 text-base text-gray-700 dark:text-gray-300">
    <CitationText
      text={displayContent}
      showFavicons={false}
      showNumbers={false}
      {articles}
      {citationMapping}
    />
  </div>
</section>
