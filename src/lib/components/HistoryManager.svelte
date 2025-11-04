<script lang="ts">
import { browser } from '$app/environment';
import { goto, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { categorySettings, displaySettings, languageSettings } from '$lib/data/settings.svelte.js';
import { dataService } from '$lib/services/dataService';
import { type NavigationParams, UrlNavigationService } from '$lib/services/urlNavigationService';

interface Props {
	batchId: string;
	dateSlug?: string | null;
	batchCreatedAt?: string | null;
	categoryId: string;
	storyIndex?: number | null;
	stories?: any[]; // Array of stories for finding story by index
	isLatestBatch?: boolean;
	isSharedView?: boolean; // Make this a bindable prop
	onNavigate?: (params: NavigationParams) => void;
}

let {
	batchId = $bindable(),
	dateSlug = $bindable(null),
	batchCreatedAt = $bindable(null),
	categoryId = $bindable(),
	storyIndex = $bindable(null),
	stories = [],
	isLatestBatch = false,
	isSharedView = $bindable(false), // Bind to parent state
	onNavigate,
}: Props = $props();

// Track the last URL we've fully processed
let lastProcessedUrl = $state('');

// Build URL based on current state
// Language settings are stored in localStorage, not in URL
function buildUrl(params?: Partial<NavigationParams>): string {
	// Determine which batch identifier to use: dateSlug (if available) or UUID
	let batchIdentifier = params?.batchId !== undefined ? params.batchId : batchId;

	// Prefer date slug over UUID when available and not using /latest prefix
	if (dateSlug && !displaySettings.useLatestUrls) {
		batchIdentifier = dateSlug;
	}

	const targetStoryIndex = params?.storyIndex !== undefined ? params.storyIndex : storyIndex;

	// Get story data if we have a story index
	let story = null;
	if (targetStoryIndex !== null && targetStoryIndex !== undefined && stories.length > 0) {
		story = stories[targetStoryIndex];
		console.log('🔍 [HistoryManager] Looking up story:', {
			targetStoryIndex,
			storiesLength: stories.length,
			foundStory: story?.title,
			clusterId: story?.cluster_number
		});
	}

	// In single page mode with no story on latest batch, don't include category in URL
	// But for historical batches, always include category
	const effectiveCategoryId = params?.categoryId !== undefined ? params.categoryId : categoryId;
	const isSinglePageMode = categorySettings.singlePageMode !== 'disabled';
	const shouldIncludeCategory = story !== null || !isSinglePageMode || !isLatestBatch;

	const navigationParams: NavigationParams = {
		batchId: batchIdentifier,
		batchDateSlug: dateSlug || undefined,
		categoryId: shouldIncludeCategory ? effectiveCategoryId : undefined,
		storyIndex: targetStoryIndex,
		// Include story data for new URL format
		clusterId: story?.cluster_number,
		storyTitle: story?.title,
		// Preserve shared view state
		isShared: params?.isShared !== undefined ? params.isShared : isSharedView,
	};

	// Use /latest URLs for the actual latest batch
	// isLatestBatch already indicates whether we're on the latest batch or not
	const useLatestPrefix = isLatestBatch;

	return UrlNavigationService.buildUrl(
		navigationParams,
		undefined, // No language in URL
		useLatestPrefix,
		batchCreatedAt,
	);
}

// Update URL without triggering navigation
export function updateUrl(params?: Partial<NavigationParams>) {
	if (!browser) return;

	// Update isSharedView immediately if provided in params
	if (params?.isShared !== undefined) {
		isSharedView = params.isShared;
	}

	const newUrl = buildUrl(params);
	const currentUrl = UrlNavigationService.getFullUrl(page.url);

	// Only update if URL actually changed
	if (newUrl !== currentUrl) {
		// DON'T update lastProcessedUrl here - let the effect handle it
		replaceState(newUrl, {});
	}
}

// Navigate to new URL with history entry
export function navigateTo(params: Partial<NavigationParams>) {
	if (!browser) return;

	const newUrl = buildUrl(params);

	// Only navigate if URL actually changed
	if (newUrl !== lastProcessedUrl) {
		lastProcessedUrl = newUrl;
		goto(newUrl);
	}
}

// Track if initial load has been processed
let initialLoadProcessed = $state(false);

// Handle initial page load and browser navigation
$effect(() => {
	if (!browser) return;

	const urlString = UrlNavigationService.getFullUrl(page.url);

	// Build what we EXPECT the URL to be based on current state
	const expectedUrl = buildUrl();

	// If the page URL matches what we expect, we're in sync - nothing to do
	if (urlString === expectedUrl || urlString === lastProcessedUrl) {
		return;
	}

	// This is a real navigation (from browser back/forward or external)
	lastProcessedUrl = urlString;

	// Parse the URL
	const params = UrlNavigationService.parseUrl(page.url);

	// Update shared view state from URL
	const hasStory = (params.storyIndex !== null && params.storyIndex !== undefined) ||
	                 (params.clusterId !== null && params.clusterId !== undefined);

	if (params.isShared && hasStory) {
		isSharedView = true;
	} else if (params.isShared && !hasStory) {
		// If shared=1 but no story, clean it from URL
		isSharedView = false;
		const cleanUrl = new URL(page.url);
		cleanUrl.searchParams.delete('shared');
		const cleanedUrlString = cleanUrl.pathname + cleanUrl.search;
		lastProcessedUrl = cleanedUrlString;
		replaceState(cleanedUrlString, {});
		return; // Don't call onNavigate for this cleanup
	} else {
		isSharedView = false;
	}

	// Handle initial load
	if (!initialLoadProcessed) {
		initialLoadProcessed = true;
	}

	// Notify parent component about navigation
	const hasParams =
		params.batchId !== undefined ||
		params.categoryId !== undefined ||
		params.storyIndex !== undefined ||
		params.clusterId !== undefined ||
		params.dataLang !== undefined ||
		params.isShared !== undefined;

	if (hasParams && onNavigate) {
		onNavigate(params);
	}
});

// Track previous props to detect actual changes
let previousBatchId = $state<string>();
let previousCategoryId = $state<string>();
let previousStoryIndex = $state<number | null>();
let previousIsLatestBatch = $state<boolean>();

// Track previous values including stories count for format normalization
let previousStoriesCount = $state(0);

// Update URL when props change (but only call updateUrl, which is idempotent)
$effect(() => {
	if (!browser || !initialLoadProcessed) return;

	// Only update URL if props actually changed
	const batchChanged = batchId !== previousBatchId;
	const categoryChanged = categoryId !== previousCategoryId;
	const storyChanged = storyIndex !== previousStoryIndex;
	const latestBatchChanged = isLatestBatch !== previousIsLatestBatch;
	const storiesLoaded = stories.length > 0 && previousStoriesCount === 0;

	if (batchChanged || categoryChanged || storyChanged || latestBatchChanged || storiesLoaded) {
		previousBatchId = batchId;
		previousCategoryId = categoryId;
		previousStoryIndex = storyIndex;
		previousIsLatestBatch = isLatestBatch;
		previousStoriesCount = stories.length;

		// Don't update URL on initial stories load if we already have a story in the URL
		// This prevents overwriting article URLs with category URLs when loading from a direct link
		if (storiesLoaded && !storyChanged && !batchChanged && !categoryChanged) {
			const parsedUrl = UrlNavigationService.parseUrl(page.url);
			const hasStoryInUrl = parsedUrl.storyIndex !== null || parsedUrl.clusterId !== null;

			if (hasStoryInUrl) {
				// Don't update URL - keep the original story URL
				return;
			}
		}

		// Update URL to reflect current state
		// updateUrl() is idempotent - it won't do anything if the URL is already correct
		updateUrl();
	}
});
</script>
