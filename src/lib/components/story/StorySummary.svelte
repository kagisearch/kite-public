<script lang="ts">
import { getContext } from 'svelte';
import { s } from '$lib/client/localization.svelte';
import { displaySettings } from '$lib/data/settings.svelte';
import type { Article, LocalizerFunction } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { getMapsProviderDisplayName } from '$lib/utils/mapsProvider';
import { getMapServiceName, openMapLocation } from '$lib/utils/mapUtils';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	story: any;
	citationMapping?: CitationMapping;
	storyLocalizer?: LocalizerFunction;
	flashcardMode?: boolean;
	selectedWords?: Set<string>;
	selectedPhrases?: Map<string, { phrase: string; sections: Set<string> }>;
	shouldJiggle?: boolean;
	onWordClick?: (word: string, section?: string) => void;
}

let { story, citationMapping, storyLocalizer = s, flashcardMode = false, selectedWords = new Set(), selectedPhrases = new Map(), shouldJiggle = false, onWordClick }: Props = $props();

// Get session from context for maps provider detection
const session = getContext<Session | null>('session');

// Handle location click
function handleLocationClick() {
	if (story.location) {
		openMapLocation(story.location, undefined, session);
	}
}

// Handle location keyboard events
function handleLocationKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		handleLocationClick();
	}
}

// Get the map service name for accessibility
const mapServiceName = $derived(getMapsProviderDisplayName(displaySettings.mapsProvider, session));

// Convert citations to numbered format if mapping is available
const displaySummary = $derived.by(() => {
	if (!citationMapping) return story.short_summary || '';
	return replaceWithNumberedCitations(story.short_summary || '', citationMapping);
});

const displayLocation = $derived.by(() => {
	if (!citationMapping || !story.location) return story.location || '';
	return replaceWithNumberedCitations(story.location, citationMapping);
});

// Get cited articles for summary
const summaryCitedArticles = $derived.by(() => {
	return getCitedArticlesForText(displaySummary, citationMapping, story.articles || []);
});

// Get cited articles for location
const locationCitedArticles = $derived.by(() => {
	if (!displayLocation) return null;
	return getCitedArticlesForText(displayLocation, citationMapping, story.articles || []);
});
</script>

<section class="mt-6">
  <div class="mb-6" dir="auto">
    {#if flashcardMode}
      <SelectableText
        text={displaySummary}
        {flashcardMode}
        {selectedWords}
        {selectedPhrases}
        {shouldJiggle}
        {onWordClick}
        section="short_summary"
      />
    {:else}
      <CitationText
        text={displaySummary}
        showFavicons={false}
        showNumbers={false}
        articles={summaryCitedArticles.citedArticles}
        {citationMapping}
        {storyLocalizer}
      />
    {/if}
  </div>
  {#if story.location}
    <button
      class="flex cursor-pointer items-center text-gray-600 dark:text-gray-300 bg-transparent border-none p-0 focus-visible-ring rounded"
      onclick={handleLocationClick}
      onkeydown={handleLocationKeydown}
      title={storyLocalizer("article.location") || `View on ${mapServiceName}`}
      aria-label="View {story.location} on {mapServiceName}"
    >
      <img src="/svg/map.svg" alt="Map icon" class="mr-2 h-5 w-5" />
      <span dir="auto">
        <CitationText
          text={displayLocation}
          showFavicons={false}
          showNumbers={false}
          inline={true}
          articles={locationCitedArticles?.citedArticles || []}
          {citationMapping}
          {storyLocalizer}
        />
      </span>
    </button>
  {/if}
</section>
