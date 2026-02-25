<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { LocalizerFunction } from '$lib/types';
import type { CitationProps } from '$lib/types/citation';
import { useCitationProcessing } from '$lib/utils/citationProcessing';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props extends CitationProps {
	content: string;
	storyLocalizer?: LocalizerFunction;
	flashcardMode?: boolean;
	selectedWords?: Set<string>;
	selectedPhrases?: Map<string, { phrase: string; sections: Set<string> }>;
	shouldJiggle?: boolean;
	onWordClick?: (word: string, section?: string) => void;
}

let {
	content,
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
const displayContent = $derived.by(() => {
	const processed = useCitationProcessing(content, citationMapping);
	// Ensure we return a string (content is always a string, but TypeScript needs assurance)
	return typeof processed === 'string' ? processed : processed.join(' ');
});
</script>

<section class="mt-6 rounded-lg bg-[#CED8FB] p-4 dark:bg-[#2A3B5E]">
  <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
    {storyLocalizer("section.didYouKnow") || "Did You Know?"}
  </h3>
  <p class="text-base text-gray-700 dark:text-gray-200">
    {#if flashcardMode}
      <SelectableText
        text={displayContent}
        {flashcardMode}
        {selectedWords}
        {shouldJiggle}
        {onWordClick}
        section="did_you_know"
      />
    {:else}
      <CitationText
        text={displayContent}
        inline={false}
        {articles}
        {citationMapping}
        {storyLocalizer}
      />
    {/if}
  </p>
</section>
