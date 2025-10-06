<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { Article } from '$lib/types';
import { getCitedArticlesForText } from '$lib/utils/citationAggregator';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { parseStructuredText } from '$lib/utils/textParsing';
import CitationText from './CitationText.svelte';

// Props
interface Props {
	perspectives?: Array<{
		text: string;
		sources?: Array<{
			name: string;
			url: string;
		}>;
	}>;
	articles?: Article[];
	citationMapping?: CitationMapping;
	storyLocalizer?: (key: string) => string;
}

let { perspectives = [], articles = [], citationMapping, storyLocalizer = s }: Props = $props();

// Convert citations in perspectives if mapping is available
const displayPerspectives = $derived.by(() => {
	if (!citationMapping) return perspectives;
	return perspectives.map((p) => ({
		...p,
		text: replaceWithNumberedCitations(p.text, citationMapping),
	}));
});

// Helper function to detect if text contains citations
function hasCitations(text: string): boolean {
	if (!text) return false;
	// Match citations like [domain#position], [common], [1], [2], etc.
	const citationPattern = /\[([^\]]+)\]/g;
	return citationPattern.test(text);
}

// Touch handling for mobile
let isScrolling = $state(false);

function handleTouchStart() {
	isScrolling = true;
}

function handleTouchEnd() {
	setTimeout(() => {
		isScrolling = false;
	}, 50);
}
</script>

<section class="mt-6">
  <h3 class="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
    {storyLocalizer("section.perspectives") || "Perspectives"}
  </h3>
  <div
    class="horizontal-scroll-container flex flex-row gap-3 overflow-x-auto pb-4"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    {#each displayPerspectives as perspective}
      {@const parsed = parseStructuredText(perspective.text)}
      <div
        class="w-56 flex-shrink-0 rounded-lg bg-gray-100 p-4 dark:bg-gray-700"
      >
        {#if parsed.hasTitle}
          {@const titleCitations = getCitedArticlesForText(
            parsed.title!,
            citationMapping,
            articles,
          )}
          {@const contentCitations = getCitedArticlesForText(
            parsed.content,
            citationMapping,
            articles,
          )}
          <p class="mb-2 text-base font-bold text-gray-800 dark:text-gray-200" dir="auto">
            <CitationText
              text={parsed.title!}
              showFavicons={false}
              showNumbers={false}
              inline={true}
              articles={titleCitations.citedArticles}
              {citationMapping}
              {storyLocalizer}
            />
          </p>
          <p class="mb-2 text-base text-gray-700 dark:text-gray-300" dir="auto">
            <CitationText
              text={parsed.content}
              showFavicons={false}
              showNumbers={false}
              inline={true}
              articles={contentCitations.citedArticles}
              {citationMapping}
              {storyLocalizer}
            />
          </p>
        {:else}
          {@const contentCitations = getCitedArticlesForText(
            parsed.content,
            citationMapping,
            articles,
          )}
          <p class="mb-2 text-base text-gray-700 dark:text-gray-300" dir="auto">
            <CitationText
              text={parsed.content}
              showFavicons={false}
              showNumbers={false}
              inline={true}
              articles={contentCitations.citedArticles}
              {citationMapping}
              {storyLocalizer}
            />
          </p>
        {/if}

        {#if perspective.sources && perspective.sources.length > 0 && !hasCitations(perspective.text)}
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {#each perspective.sources as source, idx}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#183FDC] hover:underline dark:text-[#5B89FF]"
                dir="auto"
              >
                {source.name}
              </a>
              {#if idx < perspective.sources.length - 1}
                <span> • </span>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</section>
