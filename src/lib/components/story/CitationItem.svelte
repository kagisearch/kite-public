<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import FaviconImage from '$lib/components/common/FaviconImage.svelte';
import type { Article } from '$lib/types';
import { getTimeAgo } from '$lib/utils/getTimeAgo';

interface Props {
	item: { article: Article | null; number: number; isCommon?: boolean };
	highlightedNumber?: number;
	isMobile?: boolean;
	storyLocalizer?: (key: string) => string; // Story-specific localization function
}

let { item, highlightedNumber, isMobile = false, storyLocalizer = s }: Props = $props();

const isHighlighted = $derived(
	item.isCommon ? highlightedNumber === -1 : highlightedNumber === item.number,
);

const badgeClasses = $derived(
	isHighlighted
		? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100'
		: item.isCommon
			? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
			: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
);

const containerClasses = $derived(
	isHighlighted ? 'bg-yellow-50 dark:bg-yellow-900 rounded p-1' : '',
);

const paddingClasses = $derived(isMobile ? 'px-2 py-1' : 'px-1.5 py-0.5');
const spacingClasses = $derived(isMobile ? 'space-x-3' : 'space-x-2');
const textSizeClasses = $derived(isMobile ? '' : 'text-xs');
const iconSizeClasses = $derived(isMobile ? 'w-4 h-4' : 'w-3 h-3');
const marginClasses = $derived(isMobile ? 'ms-12 mb-4' : 'ms-8 mb-2');
const linkClasses = $derived(isMobile ? 'font-medium' : 'line-clamp-2 text-xs');
const dateClasses = $derived(isMobile ? 'mt-1' : 'mt-0.5 text-xs');
</script>

{#if item.isCommon}
  <!-- Common knowledge citation -->
  <div
    class="flex items-start {spacingClasses} {textSizeClasses} {containerClasses}"
    data-citation-number="-1"
  >
    <span
      class="citation-number-badge rounded {paddingClasses} font-medium flex-shrink-0 leading-none {badgeClasses}"
    >
      [*]
    </span>
    <div class="flex-1">
      <div
        class="font-medium text-gray-700 dark:text-gray-300 {isMobile
          ? 'mb-2'
          : 'mb-1'}"
      >
        {storyLocalizer("citation.commonKnowledge.title") || "Common Knowledge"}
      </div>
      <div
        class="text-gray-600 dark:text-gray-400 {isMobile
          ? 'leading-relaxed'
          : 'text-xs leading-relaxed'}"
      >
        {storyLocalizer("citation.commonKnowledge.description") ||
          "This information is common knowledge not pulled from a specific news source, but is included for context and completeness of the story."}
      </div>
    </div>
  </div>
{:else if item.article}
  <!-- Regular article citation -->
  <div
    class="flex items-center {spacingClasses} {textSizeClasses} {containerClasses}"
    data-citation-number={item.number}
  >
    <span
      class="citation-number-badge rounded {paddingClasses} font-medium flex-shrink-0 leading-none {badgeClasses}"
    >
      [{item.number}]
    </span>
    <div class="flex items-center {spacingClasses} flex-1 min-w-0">
      <FaviconImage
        domain={item.article.domain}
        alt="{item.article.domain} favicon"
        class="{iconSizeClasses} rounded-full flex-shrink-0"
        loading="lazy"
      />
      <span
        class="font-medium text-gray-700 dark:text-gray-300 truncate leading-none"
      >
        {item.article.domain}
      </span>
    </div>
  </div>
  <div class={marginClasses}>
    <a
      href={item.article.link}
      target="_blank"
      rel="noopener noreferrer"
      class="text-gray-600 dark:text-gray-400 hover:underline {linkClasses} block"
      title={item.article.title}
    >
      {item.article.title}
    </a>
    {#if item.article.date}
      <div class="text-gray-500 dark:text-gray-400 {dateClasses}">
        {getTimeAgo(item.article.date)}
      </div>
    {/if}
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
