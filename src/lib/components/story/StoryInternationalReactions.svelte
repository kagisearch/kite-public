<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article, LocalizerFunction } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import {
	type InternationalReactionInput,
	normalizeInternationalReactions,
} from '$lib/utils/internationalReactions';
import { parseStructuredText } from '$lib/utils/textParsing';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	// Accepts the canonical string shape and tolerates object-shaped items from
	// legacy/LLM data (see normalizeInternationalReactions).
	reactions: Array<InternationalReactionInput>;
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
	reactions,
	articles = [],
	citationMapping,
	storyLocalizer = s,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
}: Props = $props();

// Normalize to canonical string shape first (tolerates object-shaped items),
// then convert citations if a mapping is available.
const displayReactions = $derived.by(() => {
	const normalized = normalizeInternationalReactions(reactions);
	if (!citationMapping) return normalized;
	return normalized.map((r) => replaceWithNumberedCitations(r, citationMapping));
});

// Parse reaction text using structured text utility
function parseReaction(reaction: string) {
	const parsed = parseStructuredText(reaction);
	const country = parsed.hasTitle ? parsed.title! : '';
	// Defensive: parseStructuredText echoes back whatever it was given as
	// `content`, so guard against non-string values before string methods.
	let response = typeof parsed.content === 'string' ? parsed.content : String(parsed.content ?? '');

	// Ensure response ends with period
	if (response && !response.endsWith('.')) {
		response += '.';
	}

	return { country, response };
}
</script>

<section class="mt-6">
	<h3 class="mb-2 text-xl font-semibold text-primary-800">
		{storyLocalizer('section.internationalReactions') || 'International Reactions'}
	</h3>
	<div class="space-y-2">
		{#each displayReactions as reaction}
			{@const parsedReaction = parseReaction(reaction)}
			{@const responseCitations = getCitedArticlesForText(
				parsedReaction.response,
				citationMapping,
				articles,
			)}
			<article class="rounded-lg bg-primary-50 p-4">
				{#if parsedReaction.country}
					<h4 class="font-semibold text-primary-800">
						{parsedReaction.country}
					</h4>
					<p class="text-base text-primary-700">
						{#if flashcardMode}
							<SelectableText
								text={parsedReaction.response}
								{flashcardMode}
								{selectedWords}
								{selectedPhrases}
								{shouldJiggle}
								{onWordClick}
								section="international_reactions"
							/>
						{:else}
							<CitationText
								text={parsedReaction.response}
								showFavicons={false}
								showNumbers={false}
								inline={true}
								articles={responseCitations.citedArticles}
								{citationMapping}
								{storyLocalizer}
							/>
						{/if}
					</p>
				{:else}
					<p class="text-base text-primary-700">
						{#if flashcardMode}
							<SelectableText
								text={parsedReaction.response}
								{flashcardMode}
								{selectedWords}
								{selectedPhrases}
								{shouldJiggle}
								{onWordClick}
								section="international_reactions"
							/>
						{:else}
							<CitationText
								text={parsedReaction.response}
								showFavicons={false}
								showNumbers={false}
								inline={true}
								articles={responseCitations.citedArticles}
								{citationMapping}
								{storyLocalizer}
							/>
						{/if}
					</p>
				{/if}
			</article>
		{/each}
	</div>
</section>
