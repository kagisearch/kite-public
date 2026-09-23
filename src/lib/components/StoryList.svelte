<script lang="ts">
import { browser } from '$app/environment';
import { page } from '$app/state';
import { s } from '$lib/client/localization.svelte';
import { categorySettings, displaySettings } from '$lib/data/settings.svelte.js';
import { kiteDB } from '$lib/db/dexie';
import { categoryMetadataStore } from '$lib/stores/categoryMetadata.svelte';
import { contentFilter } from '$lib/stores/contentFilter.svelte.js';
import { keyboardNavigation } from '$lib/stores/keyboardNavigation.svelte';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import { translationState } from '$lib/stores/translationState.svelte';
import type { Story } from '$lib/types';
import { type FilteredStory, filterStories } from '$lib/utils/contentFilter';
import type { StoryWithCategory } from '$lib/utils/storyOrdering';
import ClusteringExplainerModal from './ClusteringExplainerModal.svelte';
import StoryCard from './story/StoryCard.svelte';
import StoryCardSkeleton from './story/StoryCardSkeleton.svelte';
import { IconClock, IconInfoCircle } from '@tabler/icons-svelte';

// Enough to read as "a category is coming" without inflating the page with
// placeholders for every category at once.
const PENDING_SKELETON_COUNT = 3;

// Props
interface Props {
	stories?: Story[] | StoryWithCategory[];
	currentCategory: string;
	categoryUuid?: string;
	batchId?: string;
	batchDateSlug?: string | null; // Date slug with sequence number for share URLs
	readStories?: Record<string, boolean>;
	expandedStories?: Record<string, boolean>;
	onStoryToggle?: (storyId: string) => void;
	showSourceOverlay?: boolean;
	currentSource?: any;
	sourceArticles?: any[];
	currentMediaInfo?: any;
	isLoadingMediaInfo?: boolean;
	storyCountOverride?: number | null;
	isSharedView?: boolean;
	sharedArticleIndex?: number | null;
	sharedClusterId?: number | null; // For new URL format
	initiallyExpandedIndex?: number | null;
	showCategoryLabels?: boolean; // Show category labels for single page mode
	skipStoryCountLimit?: boolean; // Skip story count limit (for single page mode)
	// Single page mode backfills per category upstream, so the count of stories the
	// filter removed has to come from there rather than being derived here.
	filteredCountOverride?: number | null;
	// Single page mode only: categories whose stories are still in flight, each
	// anchored to the loaded category it should render above (null = last).
	pendingSections?: { id: string; name: string; beforeCategoryId: string | null }[];
	onDisplayedStoriesChange?: (stories: Story[]) => void;
}

let {
	stories = [],
	currentCategory,
	categoryUuid,
	batchId,
	batchDateSlug = null,
	readStories = $bindable({}),
	expandedStories = $bindable({}),
	onStoryToggle,
	showSourceOverlay = $bindable(false),
	currentSource = $bindable(null),
	sourceArticles = $bindable([]),
	currentMediaInfo = $bindable(null),
	isLoadingMediaInfo = $bindable(false),
	storyCountOverride = null,
	isSharedView = false,
	sharedArticleIndex = null,
	sharedClusterId = null,
	initiallyExpandedIndex = null,
	showCategoryLabels = false,
	skipStoryCountLimit = false,
	filteredCountOverride = null,
	pendingSections = [],
	onDisplayedStoriesChange,
}: Props = $props();

// Modal state
let showClusteringModal = $state(false);

// Whether the current category is community (not core)
const isCommunityCategory = $derived.by(() => {
	const metadata = categoryMetadataStore.findById(currentCategory);
	return metadata ? !metadata.isCore : false;
});

// Handle story toggle
function handleStoryToggle(story: Story) {
	// Use UUID as primary identifier for uniqueness across categories
	// Fall back to cluster_number or title for backwards compatibility
	const storyId = story.id || story.cluster_number?.toString() || story.title;
	if (onStoryToggle) {
		onStoryToggle(storyId);
	}
}

// Prefetch translations for untranslated stories in the background.
// Fires once per "wave of completions": only when the *number* of completed
// stories grows. Without this guard the $effect re-ran on every streamed
// field (because isTranslating/isComplete are read reactively), and each
// run would call prefetchTranslations again — racing with the previous
// run's sequential queue and starting the same story multiple times.
let lastCompletedCount = $state(0);
$effect(() => {
	if (!browser || !page.data.onDemandTranslations) return;

	const completedCount = stories.reduce(
		(n, s) => n + (s.id && translationState.isComplete(s.id) ? 1 : 0),
		0,
	);
	if (completedCount <= lastCompletedCount) return;
	lastCompletedCount = completedCount;

	const untranslated = stories.filter(
		(s) =>
			s.translationAvailable === false &&
			s.id &&
			!translationState.isTranslating(s.id) &&
			!translationState.isComplete(s.id),
	);
	if (untranslated.length === 0) return;

	// Prefetch next 2 untranslated stories
	const toPrefetch = untranslated.slice(0, 2);
	const sourceLang = toPrefetch[0]?.sourceLanguage || 'en';
	const targetLang = toPrefetch[0]?.selectedLanguage;

	if (targetLang && targetLang !== sourceLang) {
		translationState.prefetchTranslations(toPrefetch.map((s) => s.id!).filter(Boolean), targetLang);
	}
});

// Track sequence numbers to ignore stale responses
const toggleSequence = new Map<string, number>();

// Handle read status toggle
async function handleReadToggle(story: Story) {
	if (!story.id) return; // Skip if no UUID
	const storyId = story.id; // Use UUID directly

	// Increment sequence number for this story
	const currentSeq = (toggleSequence.get(storyId) || 0) + 1;
	toggleSequence.set(storyId, currentSeq);

	const wasRead = readStories[storyId] || false;
	const isNowRead = !wasRead;

	// Optimistic UI update - show immediately for instant feedback
	if (isNowRead) {
		readStories[storyId] = true;
	} else {
		delete readStories[storyId];
	}
	readStories = { ...readStories }; // Trigger reactivity

	// Persist to database in background
	if (isNowRead) {
		if (story.id) {
			await kiteDB.markStoryAsRead(story.id, story.title, batchId, categoryUuid);
		}
	} else {
		if (story.id) {
			await kiteDB.unmarkStoryAsRead(story.id, batchId, categoryUuid);
		}
	}

	// After DB write, check if sequence changed - if so, a newer operation is in charge
	const latestSeq = toggleSequence.get(storyId);
	if (latestSeq !== currentSeq) {
		return;
	}
}

// Mark all as read (also invoked via the Shift+M keyboard shortcut)
export async function markAllAsRead() {
	// Optimistically mark all stories as read in memory first, then persist
	// concurrently. Promise.allSettled keeps the writes parallel (the original
	// forEach(async) was concurrent too) while catching per-write IndexedDB
	// failures instead of swallowing them — partial persistence is acceptable.
	const storiesWithId = displayedStories.filter((story) => !!story.id);
	for (const story of storiesWithId) {
		readStories[story.id as string] = true;
	}
	await Promise.allSettled(
		storiesWithId.map((story) =>
			kiteDB
				.markStoryAsRead(story.id as string, story.title, batchId, categoryUuid)
				.catch((error) => console.error('Failed to persist read state for story', story.id, error)),
		),
	);
}

// Expand or collapse all stories
export function toggleExpandAll() {
	const expand = !allStoriesExpanded;

	// When collapsing, this is simple - just collapse all
	if (!expand) {
		expandedStories = {};
		return;
	}

	// Expand all at once
	const newExpanded: Record<string, boolean> = { ...expandedStories };
	displayedStories.forEach((story) => {
		const id = story.id || story.cluster_number?.toString() || story.title;
		newExpanded[id] = true;
	});
	expandedStories = newExpanded;
}

// Toggle read status by index (for keyboard navigation)
export function toggleReadStatus(index: number) {
	const story = displayedStories[index];
	if (story) {
		handleReadToggle(story);
	}
}

// Apply content filtering and story count limit
const { displayedStories, filteredCount, hiddenStories } = $derived.by(() => {
	// If in shared view mode, only show the specific shared article
	if (isSharedView) {
		let sharedStory: Story | undefined;

		console.log('🔍 [StoryList] Shared view mode - finding story:', {
			sharedArticleIndex,
			sharedClusterId,
			storiesCount: stories.length,
			expandedStories,
			firstStory: stories[0]?.title,
			firstCluster: stories[0]?.cluster_number,
		});

		// First try to find by UUID from expandedStories (most reliable)
		const expandedStoryId = Object.keys(expandedStories).find((id) => expandedStories[id]);
		if (expandedStoryId) {
			sharedStory = stories.find(
				(s) =>
					s.id === expandedStoryId ||
					s.cluster_number?.toString() === expandedStoryId ||
					s.title === expandedStoryId,
			);
			console.log(
				'🔍 [StoryList] Found by expandedStoryId:',
				expandedStoryId,
				'->',
				sharedStory?.title,
			);
		}
		// Fall back to index (legacy format)
		else if (sharedArticleIndex !== null && stories[sharedArticleIndex]) {
			sharedStory = stories[sharedArticleIndex];
			console.log('🔍 [StoryList] Found by index:', sharedStory?.title);
		}
		// Fall back to clusterId (old format, unreliable in single page mode)
		else if (sharedClusterId !== null) {
			sharedStory = stories.find((s) => s.cluster_number === sharedClusterId);
			console.log('🔍 [StoryList] Found by clusterId:', sharedClusterId, '->', sharedStory?.title);
		}

		if (sharedStory) {
			console.log('✅ [StoryList] Showing shared story:', sharedStory.title);
			return {
				displayedStories: [sharedStory] as FilteredStory[],
				filteredCount: 0,
				hiddenStories: stories.filter((s) => s !== sharedStory),
			};
		} else {
			console.warn('❌ [StoryList] Shared story not found!');
		}
	}

	// In single page mode, stories are already limited per category in orderStoriesForSinglePage,
	// so we skip the limit here to show all stories from all categories.
	// Use override if provided (e.g., from URL navigation), otherwise use user setting
	const effectiveLimit = storyCountOverride ?? displaySettings.storyCount;

	// Apply content filtering if active (has keywords). The limit is applied by
	// filterStories rather than up front, so stories it hides are backfilled with
	// the next available ones instead of leaving the category short (KNEWS-441).
	if (contentFilter.isActive) {
		const result = filterStories(
			stories,
			contentFilter.keywords,
			contentFilter.filterScope,
			contentFilter.filterMode,
			skipStoryCountLimit ? null : effectiveLimit,
		);

		return {
			displayedStories: result.filtered as FilteredStory[],
			filteredCount: filteredCountOverride ?? result.filteredCount,
			hiddenStories: result.hidden,
		};
	}

	return {
		displayedStories: (skipStoryCountLimit
			? stories
			: stories.slice(0, effectiveLimit)) as FilteredStory[],
		filteredCount: filteredCountOverride ?? 0,
		hiddenStories: [],
	};
});

// Notify parent when displayed stories change (for keyboard navigation)
$effect(() => {
	onDisplayedStoriesChange?.(displayedStories);
});

// Check if all stories are read
const allStoriesRead = $derived(
	displayedStories.every((story) => story.id && readStories[story.id]),
);

// Check if all stories are expanded
const allStoriesExpanded = $derived(
	displayedStories.length > 0 &&
		displayedStories.every(
			(story) => expandedStories[story.id || story.cluster_number?.toString() || story.title],
		),
);
</script>

<!--
  Placeholder for a category whose stories haven't arrived yet (single page
  mode fills every category in parallel after first paint). Rendering the real
  header plus a few skeletons tells the reader the category is coming and
  reserves roughly the space it will occupy, instead of leaving the page
  looking like it only has the categories that happen to have landed.
-->
{#snippet pendingSection(categoryId: string, categoryName: string)}
	<!--
	  Header and skeletons are emitted as direct siblings of the story list, with
	  the same classes a real section header uses, so the vertical rhythm matches
	  exactly. Wrapping them in a container would break it: `first:mt-0` would
	  match inside the wrapper and drop the mt-8 that separates sections.
	  Deliberately NOT `.category-section-header[data-category-id]` — the
	  sequential-mode IntersectionObserver watches that selector to drive the URL,
	  and a placeholder must not make the URL point at a category that hasn't
	  loaded.
	-->
	<div
		class="mb-4 mt-8 first:mt-0 category-section-pending"
		data-pending-category-id={categoryId}
		aria-busy="true"
	>
		<h2 class="text-2xl font-bold text-primary border-b-2 border-primary-200 pb-2">
			{categoryName}
		</h2>
		<span class="sr-only">{s('loading.stories') || 'Loading stories...'}</span>
	</div>
	{#each Array(PENDING_SKELETON_COUNT) as _, i}
		<StoryCardSkeleton variant={i} />
	{/each}
{/snippet}

<div class="story-list">
	<!--
	  `pendingSections.length` keeps the empty state from winning while single
	  page mode is still filling in. Without it, a first category that's
	  legitimately empty today would show "no stories" over the whole page while
	  every other category is still loading — the same misleading paint KNEWS-447
	  removed, just from a different direction.
	-->
	{#if displayedStories.length === 0 && pendingSections.length === 0}
		<div class="py-8 text-center text-primary-600">
			{#if contentFilter.isActive && filteredCount > 0 && contentFilter.filterMode === 'hide'}
				<!-- All stories filtered message -->
				<p class="text-base font-medium mb-2">
					{s('contentFilter.allStoriesFiltered') || 'All stories in this category were filtered'}
				</p>
				<p class="text-sm mb-4">
					{s('contentFilter.allStoriesFilteredDescription') ||
						'Your content filters have hidden all stories in this category for today.'}
				</p>
				<div class="flex flex-col sm:flex-row gap-2 justify-center">
					<button
						onclick={() => (window.location.href = '#settings/contentFilter')}
						class="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
					>
						{s('contentFilter.adjustFilters') || 'Adjust filters'}
					</button>
					<button
						onclick={() => {
							// Only disable if we have more than one enabled category
							if (categorySettings.enabled.length > 1) {
								categorySettings.disableCategory(currentCategory);
								// Navigate to the first enabled category after disabling
								const firstEnabled = categorySettings.enabled[0];
								if (firstEnabled && firstEnabled !== currentCategory) {
									window.location.href = `#${firstEnabled}`;
								} else {
									// If current was the first, find the new first
									const newEnabled = categorySettings.enabled.filter(
										(cat) => cat !== currentCategory,
									);
									if (newEnabled.length > 0) {
										window.location.href = `#${newEnabled[0]}`;
									}
								}
							} else {
								// If only one category is enabled, just navigate to settings
								window.location.href = '#settings/categories';
							}
						}}
						class="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-100"
					>
						{s('contentFilter.disableCategory') || 'Disable category'}
					</button>
				</div>
			{:else if timeTravelBatch.isHistoricalBatch}
				<p>
					{s('stories.noStoriesHistorical') || 'This category had no news on this date.'}
				</p>
			{:else if isCommunityCategory}
				<div class="max-w-md mx-auto">
					<p class="text-base font-medium mb-2">
						{s('stories.noStoriesCommunity') || 'No stories for this community category today.'}
					</p>
					<p class="text-sm mb-4">
						{s('stories.noStoriesCommunityDescription') ||
							'Not enough shared news between feeds to form stories. This happens sometimes with community categories.'}
					</p>
					<button
						onclick={() => (showClusteringModal = true)}
						class="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 inline-flex items-center gap-1.5"
					>
						<IconInfoCircle size={16} />
						{s('stories.noStoriesCommunityLearnMore') || 'Learn how it works'}
					</button>
				</div>
			{:else}
				<div class="max-w-md mx-auto">
					<div class="inline-flex items-center gap-2 text-primary-400 mb-3">
						<IconClock size={20} />
						<span class="text-sm font-medium">
							{s('stories.noStoriesCoreUpdates') || 'Temporarily unavailable'}
						</span>
					</div>
					<p class="text-base">
						{s('stories.noStoriesCore') ||
							'Stories for this category should be available soon. Check back in a bit.'}
					</p>
				</div>
			{/if}
		</div>
	{:else}
		{#each displayedStories as story, index (story.id || story.cluster_number || story.title)}
			{@const isFiltered = contentFilter.filterMode === 'blur' && story._filtered}
			{@const isLinkedStory = initiallyExpandedIndex === index}
			{@const isKeyboardSelected = keyboardNavigation.selectedIndex === index}
			{@const storyWithCategory = story as StoryWithCategory}
			{@const categoryId = storyWithCategory._categoryId || currentCategory}
			{@const categoryName = storyWithCategory._categoryName}
			{@const prevStoryWithCategory =
				index > 0 ? (displayedStories[index - 1] as StoryWithCategory) : null}
			{@const showCategoryHeader =
				showCategoryLabels &&
				!isSharedView &&
				categoryName &&
				(index === 0 || categoryId !== prevStoryWithCategory?._categoryId)}

			<!-- Category Header for Single Page Mode -->
			{#if showCategoryHeader}
				<!-- Placeholders for categories that sort before this one and are
				     still loading, so sections keep their order while they fill in. -->
				{#each pendingSections.filter((p) => p.beforeCategoryId === categoryId) as pending (pending.id)}
					{@render pendingSection(pending.id, pending.name)}
				{/each}

				<div class="mb-4 mt-8 first:mt-0 category-section-header" data-category-id={categoryId}>
					<h2 class="text-2xl font-bold text-primary border-b-2 border-primary-200 pb-2">
						{categoryName}
					</h2>
				</div>
			{/if}

			<StoryCard
				{story}
				storyIndex={index}
				{batchId}
				{batchDateSlug}
				{categoryId}
				isRead={(story.id && readStories[story.id]) || false}
				isExpanded={expandedStories[story.id || story.cluster_number?.toString() || story.title] ||
					false}
				shouldAutoScroll={!allStoriesExpanded}
				onToggle={() => handleStoryToggle(story)}
				onReadToggle={() => handleReadToggle(story)}
				priority={index < 3}
				{isFiltered}
				filterKeywords={story._matchedKeywords}
				bind:showSourceOverlay
				bind:currentSource
				bind:sourceArticles
				bind:currentMediaInfo
				bind:isLoadingMediaInfo
				{isSharedView}
				{isLinkedStory}
				{isKeyboardSelected}
			/>
		{/each}

		<!-- Categories still loading that sort after everything rendered above -->
		{#each pendingSections.filter((p) => p.beforeCategoryId === null) as pending (pending.id)}
			{@render pendingSection(pending.id, pending.name)}
		{/each}

		<!-- Filtered stories notification -->
		{#if contentFilter.isActive && filteredCount > 0 && contentFilter.showFilteredCount}
			<div class="mt-4 text-center text-sm text-primary-600">
				<p>
					{#if contentFilter.filterMode === 'hide'}
						{filteredCount === 1
							? s('contentFilter.storyHidden', {
									count: filteredCount.toString(),
								})
							: s('contentFilter.storiesHidden', {
									count: filteredCount.toString(),
								})}
					{:else}
						{filteredCount === 1
							? s('contentFilter.storyFiltered', {
									count: filteredCount.toString(),
								})
							: s('contentFilter.storiesFiltered', {
									count: filteredCount.toString(),
								})}
					{/if}
				</p>
			</div>
		{/if}

		<!-- Few stories message -->
		{#if !isSharedView && displayedStories.length > 0 && displayedStories.length <= 3}
			<div class="mt-6 py-4 text-center text-primary-600">
				<p class="text-base">
					{s('stories.fewStories') ||
						'There were no other significant news today, come back tomorrow!'}
				</p>
			</div>
		{/if}

		<!-- Mark all as read button -->
		{#if !allStoriesRead && displayedStories.length > 0}
			<div class="mt-6 w-full text-center">
				<button
					onclick={markAllAsRead}
					aria-label="Mark all {displayedStories.length} stories in {currentCategory} as read"
					class="w-full rounded-lg bg-primary-50 px-6 py-3 text-primary-800 transition-colors duration-200 hover:bg-primary-100 md:w-auto"
				>
					{s('article.markAllAsRead') || 'Mark all as read'}
				</button>
			</div>
		{/if}
	{/if}
</div>

<ClusteringExplainerModal
	visible={showClusteringModal}
	onClose={() => (showClusteringModal = false)}
/>
