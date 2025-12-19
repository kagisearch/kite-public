<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article } from '$lib/types';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	quote: string;
	author?: string;
	attribution?: string;
	sourceUrl?: string;
	sourceDomain?: string;
	articles?: Article[];
	citationMapping?: CitationMapping;
	flashcardMode?: boolean;
	selectedWords?: Set<string>;
	selectedPhrases?: Map<string, { phrase: string; sections: Set<string> }>;
	shouldJiggle?: boolean;
	onWordClick?: (word: string, section?: string) => void;
}

let {
	quote,
	author,
	attribution,
	sourceUrl,
	sourceDomain,
	articles = [],
	citationMapping,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
}: Props = $props();

// Helper function to strip outer quotes
function stripOuterQuotes(text: string): string {
	if (!text) return text;

	let trimmed = text.trim();
	// Check for various quote characters: straight double, straight single, and curly quotes
	const quoteChars = ['"', "'", '\u201C', '\u201D', '\u2018', '\u2019'];

	// Remove leading quotes (including multiple consecutive quotes)
	while (trimmed.length > 0 && quoteChars.includes(trimmed[0])) {
		trimmed = trimmed.slice(1);
	}

	// Trim spaces after removing leading quotes
	trimmed = trimmed.trimStart();

	// Trim trailing spaces before checking for trailing quotes
	trimmed = trimmed.trimEnd();

	// Remove trailing quotes (including multiple consecutive quotes)
	while (trimmed.length > 0 && quoteChars.includes(trimmed[trimmed.length - 1])) {
		trimmed = trimmed.slice(0, -1);
	}

	// Final trim to remove any remaining spaces
	return trimmed.trim();
}

// Convert citations to numbered format if mapping is available
const displayQuote = $derived.by(() => {
	const cleanedQuote = stripOuterQuotes(quote);
	if (!citationMapping) return cleanedQuote;
	return replaceWithNumberedCitations(cleanedQuote, citationMapping);
});
</script>

<section class="my-8 rounded-lg bg-[#F3F6FE] p-4 dark:bg-gray-700">
  <!-- Quote text on first line -->
  <blockquote class="text-base text-black dark:text-white mb-2 first-letter-capitalize">
    <span class="italic" aria-hidden="true">"</span>{#if sourceUrl}<a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read full quote${author ? ` from ${author}` : ''}${attribution ? ` - ${attribution}` : ''} at ${sourceDomain || 'source'}`}
        class="underline text-black dark:text-white hover:text-[#183FDC] dark:hover:text-[#5B89FF] transition-colors focus-visible-ring rounded"
        >{#if flashcardMode}<SelectableText
          text={displayQuote}
          {flashcardMode}
          {selectedWords}
          {selectedPhrases}
          {shouldJiggle}
          {onWordClick}
          section="quote"
        />{:else}<CitationText
          text={displayQuote}
          showFavicons={true}
          showNumbers={false}
          {articles}
          {citationMapping}
        />{/if}</a
      >{:else}<span class="underline"
        >{#if flashcardMode}<SelectableText
          text={displayQuote}
          {flashcardMode}
          {selectedWords}
          {selectedPhrases}
          {shouldJiggle}
          {onWordClick}
          section="quote"
        />{:else}<CitationText
          text={displayQuote}
          showFavicons={true}
          showNumbers={false}
          {articles}
          {citationMapping}
        />{/if}</span
      >{/if}<span class="italic" aria-hidden="true">"</span>
  </blockquote>

  <!-- Attribution information on second line -->
  {#if author || attribution}
    <p class="text-black dark:text-white text-sm">
      {#if author && attribution}
        <span>{author} - {attribution}</span>
      {:else if attribution}
        <span>{attribution}</span>
      {:else if author}
        <span>{author}</span>
      {/if}
    </p>
  {/if}

  {#if sourceDomain && !sourceUrl}
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
      (via {sourceDomain})
    </p>
  {/if}
</section>

<style>
  :global(.first-letter-capitalize::first-letter) {
    text-transform: uppercase;
  }
</style>
