<script lang="ts">
import { page } from '$app/state';
import { s } from '$lib/client/localization.svelte';
import { languageSettings } from '$lib/data/settings.svelte.js';
import { UrlNavigationService } from '$lib/services/urlNavigationService';
import ReportButton from '../ReportButton.svelte';
import ShareButton from '../ShareButton.svelte';

// Props
interface Props {
	story: any;
	onClose?: () => void;
	batchId?: string;
	categoryId?: string;
	storyIndex?: number;
	isSharedView?: boolean;
	storyLocalizer?: (key: string) => string;
}

let {
	story,
	onClose,
	batchId,
	categoryId,
	storyIndex,
	isSharedView = false,
	storyLocalizer = s, // Use regular localization if not provided
}: Props = $props();

// Get current navigation params from URL if not provided
const navigationParams = $derived.by(() => {
	if (batchId && categoryId && storyIndex !== undefined) {
		return {
			batchId,
			categoryId,
			storyIndex,
			dataLang: languageSettings.data,
		};
	}

	// Fall back to parsing from current URL
	const params = UrlNavigationService.parseUrl(page.url);
	return {
		batchId: params.batchId || batchId,
		categoryId: params.categoryId || categoryId,
		storyIndex: params.storyIndex ?? storyIndex,
		dataLang: params.dataLang || languageSettings.data,
	};
});
</script>

<div class="order-last mt-6 flex w-full items-center justify-center md:px-0">
  <!-- Left side: Share and Report Buttons -->
  <div class="flex-1 flex justify-start gap-2">
    <ShareButton
      title={story.title}
      description={story.short_summary}
      batchId={navigationParams.batchId}
      categoryId={navigationParams.categoryId}
      storyIndex={navigationParams.storyIndex}
      dataLang={navigationParams.dataLang}
      class="text-gray-600 transition-all duration-200 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    />
    {#if story.id}
      <ReportButton
        clusterId={story.id}
        title={story.title}
        class="text-gray-600 transition-all duration-200 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      />
    {/if}
  </div>

  <!-- Center: Close Button -->
  {#if !isSharedView}
    <button
      onclick={onClose}
      class="focus:ring-opacity-75 rounded-lg bg-black px-6 py-3 font-semibold text-white transition-colors duration-200 ease-in-out hover:bg-gray-800 focus:ring-2 focus:ring-gray-400 focus:outline-none"
    >
      {storyLocalizer("article.closeStory") || "Close"}
    </button>
  {/if}

  <!-- Right side: Empty for balance -->
  <div class="flex-1"></div>
</div>
