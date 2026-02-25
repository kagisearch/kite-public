<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import GlobePreview from '$lib/components/common/GlobePreview.svelte';
import { geocodeLocation } from '$lib/data/countryCoordinates';
import { displaySettings } from '$lib/data/settings.svelte';
import type { Article, LocalizerFunction } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { getMapServiceName, openMapLocation } from '$lib/utils/mapUtils';
import { getMapsProviderDisplayName } from '$lib/utils/mapsProvider';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';
import { flip, offset, shift, useFloating } from '@skeletonlabs/floating-ui-svelte';
import { getContext, onDestroy } from 'svelte';
import Portal from 'svelte-portal';

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

let {
	story,
	citationMapping,
	storyLocalizer = s,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
}: Props = $props();

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

// Only enable globe on devices with a fine pointer (mouse) — skip all globe JS on touch devices
const hasMousePointer =
	typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

// Globe floating popup state (only initialized on desktop)
let showGlobe = $state(false);
let globeCoords = $state<{ lat: number; lng: number } | null>(null);
let locationButtonEl: HTMLElement | undefined = $state(undefined);
let hideTimeout: number | null = null;

// Floating UI for globe popup
const floating = hasMousePointer
	? useFloating({
			placement: 'bottom-start',
			strategy: 'fixed',
			middleware: [
				offset(8),
				flip({ fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] }),
				shift({ padding: 8 }),
			],
		})
	: null;

// Prefetch coordinates only on desktop
$effect(() => {
	if (hasMousePointer && story.location) {
		geocodeLocation(story.location)
			.then((coords) => {
				globeCoords = coords;
			})
			.catch(() => {
				// Geocoding failed; globe preview will simply not be shown
			});
	}
});

// Bind the location button as the floating reference
$effect(() => {
	if (floating && locationButtonEl) {
		floating.elements.reference = locationButtonEl;
	}
});

function handleLocationMouseEnter() {
	if (!hasMousePointer) return;
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
	if (globeCoords) showGlobe = true;
}

function handleLocationMouseLeave() {
	if (!hasMousePointer) return;
	hideTimeout = window.setTimeout(() => {
		showGlobe = false;
	}, 150);
}

function handlePopupEnter() {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
}

function handlePopupLeave() {
	hideTimeout = window.setTimeout(() => {
		showGlobe = false;
	}, 150);
}

onDestroy(() => {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
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
        inline={false}
        articles={summaryCitedArticles.citedArticles}
        {citationMapping}
        {storyLocalizer}
      />
    {/if}
  </div>
  {#if story.location}
    <button
      bind:this={locationButtonEl}
      class="flex cursor-pointer items-center text-gray-600 dark:text-gray-300 bg-transparent border-none p-0 focus-visible-ring rounded"
      onclick={handleLocationClick}
      onkeydown={handleLocationKeydown}
      onmouseenter={handleLocationMouseEnter}
      onmouseleave={handleLocationMouseLeave}
      aria-label="View {story.location} on {mapServiceName}"
    >
      <img src="/svg/map.svg" alt="Map icon" class="mr-2 h-5 w-5" />
      <Tooltip
        text={storyLocalizer("article.location") || `View on ${mapServiceName}`}
        position="top"
      >
        <span dir="auto" onclick={handleLocationClick}>
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
      </Tooltip>
    </button>
  {/if}
</section>

{#if showGlobe && globeCoords && floating}
  <Portal>
    <div
      bind:this={floating.elements.floating}
      class="absolute top-0 left-0 z-tooltip overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg transition-opacity duration-200 dark:border-gray-600 dark:bg-gray-800 {floating.isPositioned
        ? 'opacity-100'
        : 'opacity-0 invisible'}"
      style={floating.floatingStyles}
      onmouseenter={handlePopupEnter}
      onmouseleave={handlePopupLeave}
      role="tooltip"
    >
      <div class="p-2">
        <GlobePreview
          lat={globeCoords.lat}
          lng={globeCoords.lng}
          size={typeof window !== "undefined" && window.innerWidth >= 768
            ? 220
            : 160}
        />
      </div>
    </div>
  </Portal>
{/if}
