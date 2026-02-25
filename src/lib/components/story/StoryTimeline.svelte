<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { languageSettings } from '$lib/data/settings.svelte.js';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import type { Article, LocalizerFunction } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { formatTimelineDate } from '$lib/utils/formatTimelineDate';
import { parseTimelineEvent } from '$lib/utils/textParsing';
import CitationText from './CitationText.svelte';
import SelectableText from './SelectableText.svelte';

// Props
interface Props {
	timeline: Array<any>; // Can be objects with date/description or strings with "::" separator
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
	timeline,
	articles = [],
	citationMapping,
	storyLocalizer = s,
	flashcardMode = false,
	selectedWords = new Set(),
	selectedPhrases = new Map(),
	shouldJiggle = false,
	onWordClick,
}: Props = $props();

// Derive batch year for date formatting
const batchYear = $derived.by(() => {
	const createdAt = timeTravelBatch.getCreatedAt();
	if (createdAt) {
		const year = new Date(createdAt).getFullYear();
		if (!Number.isNaN(year)) return year;
	}
	return new Date().getFullYear();
});

// Parse timeline events and prepare display data
const displayEvents = $derived.by(() => {
	return timeline.map((event) => {
		const parsed = parseTimelineEvent(event);
		const formattedDate = formatTimelineDate(
			parsed.date_iso,
			parsed.date,
			languageSettings.ui,
			batchYear,
		);
		const result = { ...parsed, date: formattedDate };
		if (citationMapping && result.content) {
			return {
				...result,
				content: replaceWithNumberedCitations(result.content, citationMapping),
			};
		}
		return result;
	});
});
</script>

<section class="mt-6">
  <h3 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {storyLocalizer("section.timeline") || "Timeline"}
  </h3>
  <ol
    class="timeline"
    role="list"
    aria-label="Chronological timeline of events"
  >
    {#each displayEvents as event, index}
      {@const eventCitations = getCitedArticlesForText(
        event.content,
        citationMapping,
        articles,
      )}
      <li
        class="timeline-item"
        role="listitem"
        aria-label="Event {index + 1} of {displayEvents.length}"
      >
        <div class="timeline-marker" aria-hidden="true">
          <div class="timeline-dot">
            {index + 1}
          </div>
        </div>
        <div class="timeline-content">
          {#if event.date}
            <div class="timeline-date" dir="auto">
              {event.date}
            </div>
          {/if}
          <div class="timeline-description" dir="auto">
            {#if flashcardMode}
              <SelectableText
                text={event.content}
                {flashcardMode}
                {selectedWords}
                {shouldJiggle}
                {onWordClick}
                section="timeline"
              />
            {:else}
              <CitationText
                text={event.content}
                showFavicons={false}
                showNumbers={false}
                inline={true}
                articles={eventCitations.citedArticles}
                {citationMapping}
                {storyLocalizer}
              />
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
  .timeline {
    position: relative;
    padding-left: 0;
  }

  .timeline-item {
    position: relative;
    display: flex;
    padding-bottom: 24px;
  }

  .timeline-item:last-child {
    padding-bottom: 0;
  }

  .timeline-marker {
    position: relative;
    flex-shrink: 0;
    width: 32px;
    /* Remove fixed height to let it grow with content */
    margin-right: 16px;
    /* Stretch to match content height */
    align-self: stretch;
  }

  .timeline-dot {
    width: 24px;
    height: 24px;
    background-color: var(--color-header);
    border-radius: 50%;
    position: absolute;
    top: 4px;
    left: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: white;
    /* Ensure dot stays on top of the line */
    z-index: 1;
  }

  .timeline-marker::after {
    content: "";
    position: absolute;
    width: 2px;
    /* Use 100% height to fill the entire marker container */
    height: calc(100% + 24px);
    background-color: var(--color-header);
    left: 15px;
    top: 28px;
  }

  .timeline-item:last-child .timeline-marker::after {
    display: none;
  }

  .timeline-content {
    flex: 1;
    padding-top: 2px;
    min-height: 32px; /* Reduced min-height since we're handling height dynamically */
  }

  .timeline-date {
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--color-header);
  }

  .timeline-description {
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  /* Dark mode styles */
  :global(.dark) .timeline-date {
    color: #e5e7eb;
  }

  :global(.dark) .timeline-description {
    color: #d1d5db;
  }
</style>
