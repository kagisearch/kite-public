<script lang="ts">
import type { OnThisDayEvent } from '$lib/types';
import OnThisDayEventTimeline from './onthisday/OnThisDayEventTimeline.svelte';
import OnThisDayPeopleCarousel from './onthisday/OnThisDayPeopleCarousel.svelte';
import WikipediaTooltip from './WikipediaTooltip.svelte';

// Props
interface Props {
	stories: OnThisDayEvent[];
	onWikipediaClick?: (title: string, content: string, imageUrl?: string) => void;
}

let { stories, onWikipediaClick }: Props = $props();

// Split stories into events and people
const events = $derived(stories.filter((story) => story.type === 'event'));
const people = $derived(
	stories.filter((story) => story.type === 'person' || story.type === 'people'),
);

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
    if (e.key === "Enter" || e.key === " ") {
      handleWikipediaInteraction(e);
    }
  }}
>
  {#if stories.length === 0}
    <!-- Loading spinner -->
    <div class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"
      ></div>
    </div>
  {:else}
    <!-- Events Section -->
    <OnThisDayEventTimeline {events} />

    <!-- People Section -->
    <OnThisDayPeopleCarousel {people} />
  {/if}
</div>

<!-- Wikipedia Tooltip Handler -->
<WikipediaTooltip bind:this={wikipediaTooltip} {onWikipediaClick} />
