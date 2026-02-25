<script lang="ts">
import type { Article } from '$lib/types';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	title: string;
	content: string;
	articles?: Article[];
	citationMapping?: CitationMapping;
	flashcardMode?: boolean;
	selectedWords?: Set<string>;
	selectedPhrases?: Map<string, { phrase: string; sections: Set<string> }>;
	shouldJiggle?: boolean;
	onWordClick?: (word: string, section?: string) => void;
	section?: string; // Section identifier for context
}

let {
	title,
	content,
	articles = [],
	citationMapping,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
	section,
}: Props = $props();

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
    {#if flashcardMode}
      <SelectableText
        text={displayContent}
        {flashcardMode}
        {selectedWords}
        {selectedPhrases}
        {shouldJiggle}
        {onWordClick}
        {section}
      />
    {:else}
      <CitationText
        text={displayContent}
        showFavicons={false}
        showNumbers={false}
        {articles}
        {citationMapping}
      />
    {/if}
  </div>
</section>
