<script lang="ts">
import type { Article } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { normalizeStoryTextList } from '$lib/utils/storyTextList';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	title: string;
	// Declared as strings, but object-shaped items reach us from the LLM and from
	// persisted rows, so this is normalized before use (see normalizeStoryTextList).
	items?: unknown;
	showAsList?: boolean;
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
	items = [],
	showAsList = true,
	articles = [],
	citationMapping,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
	section,
}: Props = $props();

// Coerce object-shaped items to their canonical string before anything treats
// them as text, otherwise they render as [object Object] and citation
// processing throws when it calls string methods on them.
const normalizedItems = $derived(normalizeStoryTextList(items));

// Convert citations to numbered format if mapping is available
const displayItems = $derived.by(() => {
	if (!citationMapping) return normalizedItems;
	return normalizedItems.map((item) => replaceWithNumberedCitations(item, citationMapping));
});
</script>

<section class="mt-6">
	<h3 class="mb-2 text-xl font-semibold text-primary-800">
		{title}
	</h3>
	{#if showAsList}
		<ul class="mb-4 list-inside list-disc space-y-2 text-primary-700">
			{#each displayItems as item}
				{@const itemCitations = getCitedArticlesForText(item, citationMapping, articles)}
				<li>
					{#if flashcardMode}
						<SelectableText
							text={item}
							{flashcardMode}
							{selectedWords}
							{selectedPhrases}
							{shouldJiggle}
							{onWordClick}
							{section}
						/>
					{:else}
						<CitationText
							text={item}
							showFavicons={false}
							showNumbers={false}
							inline={true}
							articles={itemCitations.citedArticles}
							{citationMapping}
						/>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mb-4 space-y-2 text-base text-primary-700">
			{#each displayItems as item}
				{@const itemCitations = getCitedArticlesForText(item, citationMapping, articles)}
				{#if flashcardMode}
					<SelectableText
						text={item}
						{flashcardMode}
						{selectedWords}
						{shouldJiggle}
						{onWordClick}
						{section}
					/>
				{:else}
					<CitationText
						text={item}
						showFavicons={false}
						showNumbers={false}
						inline={false}
						articles={itemCitations.citedArticles}
						{citationMapping}
					/>
				{/if}
			{/each}
		</div>
	{/if}
</section>
