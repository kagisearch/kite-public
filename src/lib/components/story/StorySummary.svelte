<script lang="ts">
  import { s } from "$lib/client/localization.svelte";
  import type { Article } from "$lib/types";
  import { getCitedArticlesForText } from "$lib/utils/citationAggregator";
  import {
    replaceWithNumberedCitations,
    type CitationMapping,
  } from "$lib/utils/citationContext";
  import { openMapLocation, getMapServiceName } from "$lib/utils/mapUtils";
  import CitationText from "./CitationText.svelte";
  import { base } from "$app/paths";

  // Props
  interface Props {
    story: any;
    citationMapping?: CitationMapping;
  }

  let { story, citationMapping }: Props = $props();

  // Handle location click
  function handleLocationClick() {
    if (story.location) {
      openMapLocation(story.location);
    }
  }

  // Handle location keyboard events
  function handleLocationKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleLocationClick();
    }
  }

  // Get the map service name for accessibility
  const mapServiceName = getMapServiceName();

  // Convert citations to numbered format if mapping is available
  const displaySummary = $derived.by(() => {
    if (!citationMapping) return story.short_summary || "";
    return replaceWithNumberedCitations(
      story.short_summary || "",
      citationMapping,
    );
  });

  const displayLocation = $derived.by(() => {
    if (!citationMapping || !story.location) return story.location || "";
    return replaceWithNumberedCitations(story.location, citationMapping);
  });

  // Get cited articles for summary
  const summaryCitedArticles = $derived.by(() => {
    return getCitedArticlesForText(
      displaySummary,
      citationMapping,
      story.articles || [],
    );
  });

  // Get cited articles for location
  const locationCitedArticles = $derived.by(() => {
    if (!displayLocation) return null;
    return getCitedArticlesForText(
      displayLocation,
      citationMapping,
      story.articles || [],
    );
  });
</script>

<section class="mt-6">
  <div class="mb-6">
    <CitationText
      text={displaySummary}
      showFavicons={true}
      showNumbers={false}
      articles={summaryCitedArticles.citedArticles}
      {citationMapping}
    />
  </div>
  {#if story.location}
    <button
      class="flex cursor-pointer items-center text-gray-600 dark:text-gray-300 bg-transparent border-none p-0 focus-visible-ring rounded"
      onclick={handleLocationClick}
      onkeydown={handleLocationKeydown}
      title={s("article.location") || `View on ${mapServiceName}`}
      aria-label="View {story.location} on {mapServiceName}"
    >
      <img src={`${base}/svg/map.svg`} alt="Map icon" class="mr-2 h-5 w-5" />
      <span>
        <CitationText
          text={displayLocation}
          showFavicons={false}
          showNumbers={false}
          inline={true}
          articles={locationCitedArticles?.citedArticles || []}
          {citationMapping}
        />
      </span>
    </button>
  {/if}
</section>
