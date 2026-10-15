<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { contentFilter } from '$lib/stores/contentFilter.svelte';
import type { OnThisDayEvent } from '$lib/types';
import { filterOnThisDayEvents } from '$lib/utils/contentFilter';
import WikipediaTooltip from './WikipediaTooltip.svelte';
import OnThisDayEventTimeline from './onthisday/OnThisDayEventTimeline.svelte';
import OnThisDayPeopleCarousel from './onthisday/OnThisDayPeopleCarousel.svelte';
import OnThisDaySkeleton from './onthisday/OnThisDaySkeleton.svelte';

// Props
interface Props {
	stories: OnThisDayEvent[];
	language?: string; // Language used for the OnThisDay content (for Wikipedia lookups)
	onWikipediaClick?: (title: string, content: string, imageUrl?: string) => void;
}

let { stories, language = 'en', onWikipediaClick }: Props = $props();

// Apply content filters to events and people separately
const rawEvents = $derived(stories.filter((story) => story.type === 'event'));
const rawPeople = $derived(
	stories.filter((story) => story.type === 'person' || story.type === 'people'),
);

const filteredEvents = $derived(
	filterOnThisDayEvents(rawEvents, contentFilter.keywords, contentFilter.filterMode),
);
const filteredPeople = $derived(
	filterOnThisDayEvents(rawPeople, contentFilter.keywords, contentFilter.filterMode),
);

const events = $derived(filteredEvents.filtered);
const people = $derived(filteredPeople.filtered);
const totalFilteredCount = $derived(filteredEvents.filteredCount + filteredPeople.filteredCount);

// Reference to Wikipedia tooltip component
let wikipediaTooltip: WikipediaTooltip | null = $state(null);

// Handle Wikipedia interactions
function handleWikipediaInteraction(event: Event) {
	wikipediaTooltip?.handleWikipediaInteraction(event);
}

function handleWikipediaLeave(event: Event) {
	wikipediaTooltip?.handleWikipediaLeave(event);
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="py-4"
	role="region"
	aria-label="OnThisDay events with Wikipedia links"
	onmouseover={handleWikipediaInteraction}
	onmouseleave={handleWikipediaLeave}
	onfocus={handleWikipediaInteraction}
	onblur={handleWikipediaLeave}
	onclick={handleWikipediaInteraction}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			handleWikipediaInteraction(e);
		}
	}}
>
	{#if stories.length === 0}
		<OnThisDaySkeleton />
	{:else}
		<!-- Events Section -->
		<OnThisDayEventTimeline {events} />

		<!-- People Section -->
		{#if people.length > 0}
			<OnThisDayPeopleCarousel {people} />
		{/if}

		<!-- Filtered count notification -->
		{#if contentFilter.isActive && totalFilteredCount > 0 && contentFilter.showFilteredCount}
			<div class="mt-4 text-center text-sm text-primary-600">
				<p>
					{#if contentFilter.filterMode === 'hide'}
						{s('contentFilter.hiddenCount')?.replace('{count}', String(totalFilteredCount)) ||
							`${totalFilteredCount} item(s) hidden by content filters`}
					{:else}
						{s('contentFilter.blurredCount')?.replace('{count}', String(totalFilteredCount)) ||
							`${totalFilteredCount} item(s) blurred by content filters`}
					{/if}
				</p>
			</div>
		{/if}
	{/if}
</div>

<!-- Wikipedia Tooltip Handler -->
<WikipediaTooltip bind:this={wikipediaTooltip} {language} {onWikipediaClick} />
