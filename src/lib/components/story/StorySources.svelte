<script lang="ts">
import { IconLock } from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';
import FaviconImage from '$lib/components/common/FaviconImage.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import { languageSettings } from '$lib/data/settings.svelte.js';
import { dataService } from '$lib/services/dataService';
import { preferredSources } from '$lib/stores/preferredSources.svelte.js';
import type { LocalizerFunction, MediaInfo } from '$lib/types';
import { getMostRecentArticleDate, getTimeAgo } from '$lib/utils/getTimeAgo';

// Props
interface Props {
	domains: any[];
	articles: any[];
	showSourceOverlay?: boolean;
	currentSource?: any;
	sourceArticles?: any[];
	currentMediaInfo?: MediaInfo | null;
	isLoadingMediaInfo?: boolean;
	storyLocalizer?: LocalizerFunction;
}

let {
	domains,
	articles,
	showSourceOverlay = $bindable(false),
	currentSource = $bindable(null),
	sourceArticles = $bindable([]),
	currentMediaInfo = $bindable(null),
	isLoadingMediaInfo = $bindable(false),
	storyLocalizer = s,
}: Props = $props();

// Sort domains: preferred first, then regular, then Reddit at end
let sortedDomains = $derived.by(() => {
	if (!domains || domains.length === 0) return [];

	// Separate into: preferred (non-reddit), regular (non-reddit), reddit
	const preferred = domains.filter(
		(d) => preferredSources.isPreferred(d?.name) && !d?.name?.toLowerCase().includes('reddit.com'),
	);
	const regular = domains.filter(
		(d) => !preferredSources.isPreferred(d?.name) && !d?.name?.toLowerCase().includes('reddit.com'),
	);
	const reddit = domains.filter((d) => d?.name?.toLowerCase().includes('reddit.com'));

	// Concatenate: preferred first, then regular, then Reddit at the end
	return [...preferred, ...regular, ...reddit];
});

// State
let showAllSources = $state(true);
let visibleSources = $state(typeof window !== 'undefined' && window.innerWidth <= 768 ? 4 : 8);

// Handle window resize
if (typeof window !== 'undefined') {
	window.addEventListener('resize', () => {
		visibleSources = window.innerWidth <= 768 ? 4 : 8;
	});
}

// Calculate publisher and article counts
let publisherCount = $derived(sortedDomains.length);
let totalArticleCount = $derived(articles?.length || 0);

// Get the most recent article URL for a domain
function getMostRecentArticleUrl(domain: any): string | undefined {
	const domainArticles = articles?.filter((a) => a.domain === domain?.name) || [];
	if (domainArticles.length === 0) return undefined;

	// Sort by date descending and get the first one
	const sorted = [...domainArticles].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);
	return sorted[0]?.link;
}

// Handle source click - opens overlay on regular click
async function handleSourceClick(event: MouseEvent, domain: any) {
	// Allow middle-click, ctrl-click, cmd-click to work naturally as links
	if (event.button === 1 || event.ctrlKey || event.metaKey) {
		return; // Let the default anchor behavior handle it
	}

	// For regular left-click, prevent navigation and open overlay
	event.preventDefault();

	currentSource = domain;
	sourceArticles = articles.filter((a) => a.domain === domain?.name) || [];
	currentMediaInfo = null;
	isLoadingMediaInfo = true;

	// Fetch media info for this specific domain
	if (domain?.name) {
		try {
			const mediaInfo = await dataService.loadMediaDataForHost(domain.name, languageSettings.data);
			currentMediaInfo = mediaInfo;
		} catch (error) {
			console.error('Failed to load media info for domain:', domain.name, error);
			currentMediaInfo = null;
		}
	}

	isLoadingMediaInfo = false;
	showSourceOverlay = true;
}
</script>

<section class="mt-6">
  <div class="mb-4 flex items-center justify-between">
    <div>
      <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
        {storyLocalizer("section.sources") || "Sources"}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {storyLocalizer("sources.summary", {
          publishers: publisherCount.toString(),
          articles: totalArticleCount.toString(),
        })}
      </p>
    </div>
    {#if sortedDomains.length > visibleSources}
      <button
        onclick={() => (showAllSources = !showAllSources)}
        class="text-gray-600 hover:text-gray-800 focus-visible-ring rounded dark:text-gray-400 dark:hover:text-gray-200"
        aria-label={showAllSources
          ? storyLocalizer("sources.showFewer.aria", { count: sortedDomains.length.toString() }) || `Show fewer sources (${sortedDomains.length} total)`
          : storyLocalizer("sources.showAll.aria", { count: sortedDomains.length.toString() }) || `Show all ${sortedDomains.length} sources`}
        aria-expanded={showAllSources}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="ms-1 inline-block h-5 w-5 transform transition-transform duration-200"
          class:rotate-180={showAllSources}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    {/if}
  </div>

  <div
    class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
  >
    {#each sortedDomains as domain, index}
      {#if index < visibleSources || showAllSources}
        <a
          href={getMostRecentArticleUrl(domain) || '#'}
          target="_blank"
          rel="noopener noreferrer"
          class="flex w-full flex-col items-start space-y-1 rounded-lg py-2 ps-2 text-start transition-colors hover:bg-gray-100 focus-visible-ring dark:hover:bg-gray-700"
          onclick={(e) => handleSourceClick(e, domain)}
          aria-label={(() => {
            const count = articles?.filter((a) => a.domain === domain?.name).length || 0;
            return count > 0
              ? `View ${count} ${count === 1 ? 'article' : 'articles'} from ${domain?.name || 'Unknown'}`
              : `View articles from ${domain?.name || 'Unknown'}`;
          })()}
        >
          <div class="flex w-full min-w-0 items-center space-x-2">
            <FaviconImage
              domain={domain?.name || ""}
              alt={domain?.name ? `${domain.name} Favicon` : "Default Favicon"}
              class="h-5 w-5 rounded-sm"
              loading="lazy"
            />
            <span class="truncate text-sm font-semibold" dir="auto">
              {domain?.name || "Unknown"}
            </span>
            {#if domain?.isPaywalled}
              <Tooltip
                text={storyLocalizer("sources.paywallTooltip") || "This source may require a subscription to access full articles"}
                position="top"
              >
                <span
                  class="flex-shrink-0"
                  aria-label={storyLocalizer("sources.paywall") || "Paywall"}
                >
                  <IconLock class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                </span>
              </Tooltip>
            {/if}
          </div>
          <span class="ms-7 text-xs text-gray-500 dark:text-gray-400">
            {#if articles}
              {@const articleCount = articles.filter(
                (a) => a.domain === domain?.name,
              ).length}
              {@const mostRecentDate = getMostRecentArticleDate(
                articles,
                domain?.name,
              )}
              {#if mostRecentDate && articleCount > 0}
                {getTimeAgo(mostRecentDate)} · {articleCount === 1
                  ? storyLocalizer("sources.article", { count: articleCount.toString() })
                  : storyLocalizer("sources.articles", { count: articleCount.toString() })}
              {:else}
                {articleCount === 1
                  ? storyLocalizer("sources.article", { count: articleCount.toString() })
                  : storyLocalizer("sources.articles", { count: articleCount.toString() })}
              {/if}
            {:else}
              {storyLocalizer("sources.articles", { count: "0" })}
            {/if}
          </span>
        </a>
      {/if}
    {/each}
  </div>
</section>
