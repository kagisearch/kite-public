<script lang="ts">
import { IconCheck, IconSearch, IconWorld } from '@tabler/icons-svelte';
import { untrack } from 'svelte';
import { flip } from 'svelte/animate';
import { dndzone, TRIGGERS } from 'svelte-dnd-action';
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import {
	type CategoryHeaderPosition,
	categorySettings,
	displaySettings,
	type SinglePageMode,
	settings,
} from '$lib/data/settings.svelte.js';
import type { CategoryMetadata } from '$lib/services/categoryMetadataService';
import { categoryMetadataStore } from '$lib/stores/categoryMetadata.svelte';
import { experimental } from '$lib/stores/experimental.svelte.js';
import type { Category } from '$lib/types';
import { getCategoryDisplayName } from '$lib/utils/category';
import ContributeCategoryModal from './ContributeCategoryModal.svelte';

// Contribute modal state
let showContributeModal = $state(false);

// Props
interface Props {
	categories?: Category[];
}

let { categories: allCategories = [] }: Props = $props();

// Track dragging state
let isDragging = $state(false);
let draggedItemId = $state<string | null>(null);

// Animation duration
const flipDurationMs = 200;

// Local state for drag and drop - only updated when not dragging
let enabledItems = $state<Array<{ id: string; name: string }>>([]);
let disabledItems = $state<Array<{ id: string; name: string }>>([]);

// Category filtering
let categoryFilter = $state('all');

// Search state
let searchQuery = $state('');

// Quick-jump letter filter
let letterFilter = $state<string | null>(null);

// Track container height to prevent shrinking when filtering
let disabledContainerRef = $state<HTMLElement | null>(null);
let containerMinHeight = $state<number>(320); // Default min height

// Capture natural height when showing all items (no filters)
$effect(() => {
	if (disabledContainerRef && categoryFilter === 'all' && !letterFilter && !searchQuery) {
		// Measure after DOM updates
		requestAnimationFrame(() => {
			if (disabledContainerRef) {
				const height = disabledContainerRef.scrollHeight;
				if (height > containerMinHeight) {
					containerMinHeight = height;
				}
			}
		});
	}
});

// Get all available letters from disabled items
const availableLetters = $derived.by(() => {
	const letters = new Set<string>();
	disabledItems.forEach((item) => {
		const displayName = getDisplayName(item);
		const firstLetter = displayName.charAt(0).toUpperCase();
		if (/[A-Z]/.test(firstLetter)) {
			letters.add(firstLetter);
		} else {
			letters.add('#');
		}
	});
	return Array.from(letters).sort();
});

// All possible letters for the quick-jump bar
const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Single page mode
let currentSinglePageMode = $state<string>(categorySettings.singlePageMode);

// Category header position (mobile only)
let currentCategoryHeaderPosition = $state(displaySettings.categoryHeaderPosition as string);

// Sync category header position with store
$effect(() => {
	currentCategoryHeaderPosition = displaySettings.categoryHeaderPosition as string;
});

function handleCategoryHeaderPositionChange(position: string) {
	displaySettings.categoryHeaderPosition = position as CategoryHeaderPosition;
	settings.categoryHeaderPosition.save();
	currentCategoryHeaderPosition = position;
}

// Toggle handler for horizontal swiping
function toggleDisableCategorySwipe() {
	experimental.toggleFeature('disableCategorySwipe');
}

// Single page mode options
const singlePageModeOptions = $derived([
	{
		value: 'disabled',
		label: s('settings.categories.singlePageMode.disabled') || 'Tabs (default)',
		tooltip:
			s('settings.categories.singlePageMode.disabledTooltip') ||
			'Display stories in separate tabs for each category. Click tabs to switch between categories.',
	},
	{
		value: 'sequential',
		label: s('settings.categories.singlePageMode.sequential') || 'Single page - Sequential',
		tooltip:
			s('settings.categories.singlePageMode.sequentialTooltip') ||
			'Display all stories in one scrollable page. Stories are grouped by category - all stories from the first category, then all from the second, and so on.',
	},
	{
		value: 'mixed',
		label: s('settings.categories.singlePageMode.mixed') || 'Single page - Mixed',
		tooltip:
			s('settings.categories.singlePageMode.mixedTooltip') ||
			'Display all stories in one scrollable page. Stories are interleaved - first story from each category, then second story from each, and so on. Categories with fewer stories are skipped when exhausted.',
	},
	{
		value: 'random',
		label: s('settings.categories.singlePageMode.random') || 'Single page - Random',
		tooltip:
			s('settings.categories.singlePageMode.randomTooltip') ||
			'Display all stories in one scrollable page in random order. Get a serendipitous mix of topics and perspectives.',
	},
]);

// Sync single page mode with store
$effect(() => {
	currentSinglePageMode = categorySettings.singlePageMode;
});

// Filter options for the Select component
const filterOptions = $derived([
	{ value: 'all', label: s('settings.categories.types.all') || 'All' },
	{
		value: 'core',
		label: s('settings.categories.types.core') || 'Kagi Curated',
		icon: IconCheck,
		tooltip:
			s('settings.categories.coreTooltip') ||
			'Maintained by Kagi team. High quality, diverse perspectives.',
	},
	{
		value: 'community',
		label: s('settings.categories.types.community') || 'Community',
		icon: IconWorld,
		tooltip:
			s('settings.categories.communityTooltip') ||
			'Community-maintained feeds. May have fewer sources or perspectives.',
	},
]);

// Initialize categories when they change
$effect(() => {
	if (allCategories.length > 0) {
		untrack(() => {
			categorySettings.setAllCategories(allCategories);
			categorySettings.initWithDefaults();
			syncFromStore();
		});
	}
});

// Sync from store when not dragging
$effect(() => {
	// Explicitly track dependencies
	void categorySettings.enabled;
	void categorySettings.disabled;
	void categorySettings.temporaryCategory;

	if (!isDragging) {
		syncFromStore();
	}
});

function syncFromStore() {
	// Filter out temporary category from enabled list - it should only appear in disabled
	enabledItems = categorySettings.enabled
		.filter((categoryId) => categoryId !== categorySettings.temporaryCategory)
		.map((categoryId) => {
			const category = categorySettings.allCategories.find((cat) => cat.id === categoryId);
			// Fallback to metadata if category not in current batch
			if (!category) {
				const metadata = categoryMetadataStore.findById(categoryId);
				return {
					id: categoryId,
					name: metadata?.displayName || categoryId,
				};
			}
			return {
				id: categoryId,
				name: category.name,
			};
		});

	// Temporary category should appear in disabled list
	const disabledCategoryIds = categorySettings.temporaryCategory
		? [...categorySettings.disabled, categorySettings.temporaryCategory]
		: categorySettings.disabled;

	disabledItems = disabledCategoryIds
		.filter((categoryId, index, self) => self.indexOf(categoryId) === index) // Remove duplicates
		.map((categoryId) => {
			const category = categorySettings.allCategories.find((cat) => cat.id === categoryId);
			// Fallback to metadata if category not in current batch
			if (!category) {
				const metadata = categoryMetadataStore.findById(categoryId);
				return {
					id: categoryId,
					name: metadata?.displayName || categoryId,
				};
			}
			return {
				id: categoryId,
				name: category.name,
			};
		})
		.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
}

// Get category type for filtering (core or community)
function getCategoryType(categoryId: string): 'core' | 'community' {
	// Skip shadow placeholder items created by the drag library
	if (categoryId.startsWith('id:dnd-shadow-placeholder')) {
		return 'community';
	}

	const metadata = categoryMetadataStore.findById(categoryId);
	if (!metadata) {
		// Don't spam warnings for common categories that might not be in metadata
		if (categoryMetadataStore.isLoaded) {
			console.warn(`No metadata found for category: ${categoryId}`);
		}
		return 'community';
	}
	return metadata.isCore ? 'core' : 'community';
}

// Check if category is core (maintained by Kagi)
function isCoreCategory(categoryId: string): boolean {
	const metadata = categoryMetadataStore.findById(categoryId);
	return metadata?.isCore ?? false;
}

// Helper to get display name with metadata lookup from global store
function getDisplayName(category: Category | { id: string; name: string }): string {
	const metadata = categoryMetadataStore.findById(category.id);
	if (!metadata) {
		// Fallback: return the name directly if no metadata found
		return category.name;
	}
	return getCategoryDisplayName(category as Category, metadata);
}

// Check if category matches search query and letter filter
function matchesSearch(category: { id: string; name: string }): boolean {
	const displayName = getDisplayName(category);

	// Check letter filter
	if (letterFilter) {
		const firstLetter = displayName.charAt(0).toUpperCase();
		const categoryLetter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
		if (categoryLetter !== letterFilter) return false;
	}

	// Check search query
	if (!searchQuery.trim()) return true;
	const query = searchQuery.toLowerCase().trim();
	return displayName.toLowerCase().includes(query) || category.id.toLowerCase().includes(query);
}

// Count categories by type for filter labels
function getCategoryCounts() {
	const counts = {
		all: disabledItems.length,
		core: 0,
		community: 0,
	};

	disabledItems.forEach((item) => {
		const isCore = isCoreCategory(item.id);
		if (isCore) {
			counts.core++;
		} else {
			counts.community++;
		}
	});

	return counts;
}

// Update filter options with counts
const filterOptionsWithCounts = $derived.by(() => {
	const counts = getCategoryCounts();
	return filterOptions.map((option) => ({
		...option,
		label:
			option.value === 'all'
				? `${s('settings.categories.allCategories') || 'All'} (${counts.all})`
				: `${option.label} (${counts[option.value as keyof typeof counts] || 0})`,
	}));
});

// Drag handlers for enabled zone
function handleEnabledConsider(e: CustomEvent) {
	const { trigger, id } = e.detail.info;
	if (trigger === TRIGGERS.DRAG_STARTED) {
		isDragging = true;
		draggedItemId = id;
	}
	enabledItems = e.detail.items;
}

function handleEnabledFinalize(e: CustomEvent) {
	const { trigger } = e.detail.info;
  const isDroppedTrigger = trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_INTO_ANOTHER;

  // Return early if not a dropped trigger (e.g. a click event when disabling a category)
  // This ensures stale data is not used in the other events.
  if (!isDroppedTrigger) {
    return;
  }

	isDragging = false;
	draggedItemId = null;

	const newItems = e.detail.items;

	// Extract the new enabled categories in their drag order
	const newEnabled = newItems.map((item: any) => item.id);

	// Save the temporary category ID before we modify anything
	const tempCategoryId = categorySettings.temporaryCategory;

	// If the temporary category was enabled, clear the temporary flag FIRST
	// We do this BEFORE setEnabled so syncFromStore() doesn't filter it out
	if (tempCategoryId && newEnabled.includes(tempCategoryId)) {
		categorySettings.clearTemporaryFlag();
	}

	// Update enabled/disabled states
	// This will handle adding the category to enabled list
	categorySettings.setEnabled(newEnabled);

	// Update the global order to preserve the exact drag order within enabled categories
	// Build new order: enabled categories in drag order + disabled categories in original order
	const currentDisabled = categorySettings.disabled;
	const disabledInOrder = categorySettings.order.filter((id) => currentDisabled.includes(id));

	// Merge enabled (in new order) with disabled (in old order)
	// For now, put enabled first, then disabled - this preserves the drag order
	const newOrder = [...newEnabled, ...disabledInOrder];
	categorySettings.setOrder(newOrder);
}

// Drag handlers for disabled zone
function handleDisabledConsider(e: CustomEvent) {
	const { trigger, id } = e.detail.info;
	if (trigger === TRIGGERS.DRAG_STARTED) {
		isDragging = true;
		draggedItemId = id;
	}
	// Only update if we have valid items to avoid undefined errors
	if (e.detail?.items) {
		disabledItems = e.detail.items;
	}
}

function handleDisabledFinalize(e: CustomEvent) {
	const { trigger } = e.detail.info;
	const isDroppedTrigger = trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_INTO_ANOTHER;

  // Return early if not a dropped trigger (e.g. a click event when disabling a category)
  // This ensures stale data is not used in the other events.
  if (!isDroppedTrigger) {
    return;
  }

	isDragging = false;
	draggedItemId = null;

	// Check if we have valid items to avoid undefined errors
	if (!e.detail?.items) {
		return;
	}

	const newItems = e.detail.items;

	// Extract the new disabled categories in their drag order
	const newDisabled = newItems.map((item: any) => item.id);

	// When working with filtered items, we need to preserve the order of categories
	// that aren't currently visible in the filter
	const hiddenDisabled = disabledItems
		.filter((item) => {
			const categoryType = getCategoryType(item.id);
			return categoryFilter !== 'all' && categoryType !== categoryFilter;
		})
		.map((item) => item.id);

	// Combine visible reordered items with hidden items (maintain their original order)
	const allDisabled = [...newDisabled, ...hiddenDisabled];

	// Update enabled/disabled states
	categorySettings.setDisabled(allDisabled);

	// Update the global order to preserve the exact drag order within disabled categories
	const currentEnabled = categorySettings.enabled;
	const enabledInOrder = categorySettings.order.filter((id) => currentEnabled.includes(id));

	// Merge enabled (in old order) with disabled (in new order)
	const newOrder = [...enabledInOrder, ...allDisabled];
	categorySettings.setOrder(newOrder);
}

// Click handlers for toggling categories
function handleEnabledClick(categoryId: string) {
	// Prevent disabling the last category
	if (enabledItems.length > 1) {
		// Move from enabled to disabled
		categorySettings.disableCategory(categoryId);
	}
}

function handleDisabledClick(categoryId: string) {
	// Move from disabled to enabled
	categorySettings.enableCategory(categoryId);
}

// Single page mode change handler
function handleSinglePageModeChange(mode: string) {
	categorySettings.singlePageMode = mode as SinglePageMode;
	currentSinglePageMode = mode;
}
</script>

<div class="space-y-4">
  <div class="mb-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {s("settings.categories.instructions") ||
        "Drag to reorder categories or click to enable/disable them."}
    </p>
  </div>

  <!-- Single Page Mode Setting -->
  <div class="mb-6">
    <Select
      bind:value={currentSinglePageMode}
      options={singlePageModeOptions}
      label={s("settings.categories.singlePageMode.label") ||
        "Display Mode"}
      onChange={handleSinglePageModeChange}
    />
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      {s("settings.categories.singlePageMode.description") ||
        "Choose how to display stories: in tabs (default), or all in a single page with different ordering options."}
    </p>
  </div>

  <!-- Navigation Settings (mobile) -->
  <div class="mb-6 space-y-4">
    <!-- Mobile-only category header position setting -->
    <div class="flex flex-col space-y-2 md:hidden">
      <Select
        bind:value={currentCategoryHeaderPosition}
        options={[
          {
            value: "bottom",
            label: s("settings.categoryHeaderPosition.bottom") || "Bottom",
          },
          {
            value: "top",
            label: s("settings.categoryHeaderPosition.top") || "Top",
          },
        ]}
        label={s("settings.categoryHeaderPosition.label") ||
          "Category Header Position"}
        onChange={handleCategoryHeaderPositionChange}
      />
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {s("settings.categoryHeaderPosition.description") ||
          "Choose where category tabs appear on mobile devices"}
      </p>
    </div>

    <!-- Disable Category Swipe -->
    <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/50 md:hidden">
      <div class="flex-1 pe-4">
        <label
          for="disable-category-swipe"
          id="label-disable-swipe"
          class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {s("settings.experimental.disableCategorySwipe.label") ||
            "Disable horizontal category swiping"}
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {s("settings.experimental.disableCategorySwipe.description") ||
            "When enabled, horizontal swiping to change categories on mobile devices will be disabled."}
        </p>
      </div>
      <button
        id="disable-category-swipe"
        onclick={toggleDisableCategorySwipe}
        type="button"
        class="focus-visible-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
        class:bg-blue-600={experimental.disableCategorySwipe}
        class:bg-gray-200={!experimental.disableCategorySwipe}
        class:dark:bg-gray-600={!experimental.disableCategorySwipe}
        role="switch"
        aria-checked={experimental.disableCategorySwipe}
        aria-labelledby="label-disable-swipe"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition"
          class:ltr:translate-x-6={experimental.disableCategorySwipe}
          class:rtl:-translate-x-6={experimental.disableCategorySwipe}
          class:ltr:translate-x-1={!experimental.disableCategorySwipe}
          class:rtl:-translate-x-1={!experimental.disableCategorySwipe}
        ></span>
      </button>
    </div>
  </div>

  <div>
    <h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      {s("settings.categories.enabled") || "Enabled Categories"}
    </h4>
    <div
      class="min-h-[40px] rounded-lg p-3 flex flex-wrap gap-2 border-2 border-dashed"
      class:border-gray-300={!isDragging}
      class:dark:border-gray-600={!isDragging}
      class:border-transparent={isDragging}
      use:dndzone={{
        items: enabledItems,
        flipDurationMs,
        type: "category",
        dropTargetStyle: {
          outline: "rgba(59, 130, 246, 0.5) solid 2px",
          outlineOffset: "-2px",
          borderRadius: "0.5rem",
        },
        morphDisabled: true,
        dragDisabled: enabledItems.length === 1,
      }}
      onconsider={handleEnabledConsider}
      onfinalize={handleEnabledFinalize}
    >
      {#each enabledItems as category, index (`enabled-${category.id}-${index}`)}
        {@const isCore = isCoreCategory(category.id)}
        <div
          animate:flip={{ duration: flipDurationMs }}
          class="group inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-200 focus-visible-ring
						{draggedItemId === category.id ? 'opacity-50' : ''}
						{enabledItems.length === 1
            ? 'cursor-not-allowed opacity-75'
            : 'cursor-grab active:cursor-grabbing hover:bg-blue-200 dark:hover:bg-blue-700'}
						transition-colors"
          title={enabledItems.length === 1
            ? s("settings.categories.lastCategory") ||
              "Cannot disable the last category"
            : s("settings.categories.disable") ||
              "Click to disable, drag to reorder"}
          role="button"
          tabindex={enabledItems.length === 1 ? -1 : 0}
          aria-disabled={enabledItems.length === 1}
          aria-label={enabledItems.length === 1
            ? `${getDisplayName(category)} - last category, cannot disable`
            : `${getDisplayName(category)} - click to disable or drag to reorder`}
          onclick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (enabledItems.length > 1) {
              handleEnabledClick(category.id);
            }
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              if (enabledItems.length > 1) {
                handleEnabledClick(category.id);
              }
            }
          }}
          onmousedown={(e) => {
            if (enabledItems.length === 1) {
              e.stopPropagation();
            }
          }}
        >
          <span class="select-none">
            {getDisplayName(category)}
          </span>
        </div>
      {/each}
      {#if enabledItems.length === 0}
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {s("settings.categories.noEnabled") || "No enabled categories"}
        </div>
      {/if}
    </div>
  </div>

  <div>
    <div class="mb-3 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {s("settings.categories.disabled") || "Available Categories"}
        </h4>
        <div class="w-48">
          <Select
            bind:value={categoryFilter}
            options={filterOptionsWithCounts}
            label={s("settings.categories.filterByType") || "Filter"}
            placeholder={s("settings.categories.filterPlaceholder") || "All"}
            className="text-xs"
            height="h-8"
            onChange={(value: string) => {
              categoryFilter = value;
            }}
          />
        </div>
      </div>
      <!-- Search input -->
      <div class="relative">
        <IconSearch size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={s("settings.categories.searchPlaceholder") || "Search categories..."}
          class="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus-visible-ring"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => searchQuery = ''}
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded focus-visible-ring"
            aria-label={s("ui.clear") || "Clear search"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>

      <!-- Quick-jump letter bar -->
      <div class="flex flex-wrap gap-0.5 justify-center">
        <button
          type="button"
          onclick={() => letterFilter = null}
          class="px-1.5 py-0.5 text-xs font-medium rounded transition-colors focus-visible-ring
            {letterFilter === null
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'}"
          aria-pressed={letterFilter === null}
        >
          All
        </button>
        {#each allLetters as letter}
          {@const hasItems = availableLetters.includes(letter)}
          <button
            type="button"
            onclick={() => letterFilter = letterFilter === letter ? null : letter}
            disabled={!hasItems}
            class="size-6 text-xs font-medium rounded transition-colors focus-visible-ring
              {letterFilter === letter
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                : hasItems
                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}"
            aria-pressed={letterFilter === letter}
          >
            {letter}
          </button>
        {/each}
      </div>
    </div>

    <!-- Always use dndzone, dynamic min-height to prevent shrinking when filtering -->
    <div
      bind:this={disabledContainerRef}
      class="rounded-lg p-3 flex flex-wrap gap-2 content-start border-2 border-dashed"
      style="min-height: {containerMinHeight}px"
      class:border-gray-300={!isDragging}
      class:dark:border-gray-600={!isDragging}
      class:border-transparent={isDragging}
      use:dndzone={{
        items: disabledItems,
        flipDurationMs,
        type: "category",
        dropTargetStyle: {
          outline: "rgba(156, 163, 175, 0.5) solid 2px",
          outlineOffset: "-2px",
          borderRadius: "0.5rem",
        },
        morphDisabled: true,
      }}
      onconsider={handleDisabledConsider}
      onfinalize={handleDisabledFinalize}
    >
      {#each disabledItems as category, index (`disabled-${category.id}-${index}`)}
        {@const isCore = isCoreCategory(category.id)}
        {@const matchesTypeFilter =
          categoryFilter === "all" ||
          (categoryFilter === "core" ? isCore : !isCore)}
        {@const isFiltered = !matchesTypeFilter || !matchesSearch(category)}
        {@const isBeingDragged = draggedItemId === category.id}
        <div
          animate:flip={{ duration: flipDurationMs }}
          class="group inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300 focus-visible-ring
						{isBeingDragged
            ? 'opacity-50'
            : ''} cursor-grab active:cursor-grabbing hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          style={isFiltered && !isBeingDragged
            ? "position: absolute; left: -9999px; opacity: 0; pointer-events: none;"
            : ""}
          title={s("settings.categories.enable") ||
            "Click to enable, drag to reorder"}
          role="button"
          tabindex={isFiltered ? -1 : 0}
          aria-label={`${getDisplayName(category)} - click to enable or drag to reorder`}
          onclick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleDisabledClick(category.id);
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              handleDisabledClick(category.id);
            }
          }}
          onmousedown={(e) => e.stopPropagation()}
        >
          <span class="select-none">
            {getDisplayName(category)}
          </span>
        </div>
      {/each}
      {#if disabledItems.length === 0}
        <div
          class="text-sm text-gray-500 dark:text-gray-400 pointer-events-none select-none"
        >
          {s("settings.categories.noDisabled") || "All categories enabled"}
        </div>
      {:else if disabledItems.every((item) => !matchesSearch(item))}
        <div
          class="text-sm text-gray-500 dark:text-gray-400 pointer-events-none select-none"
        >
          {#if searchQuery}
            {s("settings.categories.noSearchResults") || "No categories match your search"}
          {:else if letterFilter}
            {s("settings.categories.noLetterResults") || `No categories starting with "${letterFilter}"`}
          {:else}
            {s("settings.categories.noFiltered") || "No categories match the current filter"}
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <div class="text-center">
    <button
      onclick={() => showContributeModal = true}
      class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 focus-visible-ring rounded"
    >
      {s("settings.categories.contribute") || "+ Contribute a category"}
    </button>
  </div>
</div>

<ContributeCategoryModal
  visible={showContributeModal}
  onClose={() => showContributeModal = false}
/>
