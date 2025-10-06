<script lang="ts">
import {
	IconBuilding,
	IconBulb,
	IconDots,
	IconMapPin,
	IconNews,
	IconPlus,
	IconWorld,
	IconX,
} from '@tabler/icons-svelte';
import { untrack } from 'svelte';
import { flip } from 'svelte/animate';
import { dndzone, TRIGGERS } from 'svelte-dnd-action';
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import { categorySettings } from '$lib/data/settings.svelte.js';
import {
	type CategoryMetadata,
	categoryMetadataService,
} from '$lib/services/categoryMetadataService';
import type { Category } from '$lib/types';
import { getCategoryDisplayName } from '$lib/utils/category';

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

// Category metadata and filtering
let categoryMetadata = $state<CategoryMetadata[]>([]);
let categoryFilter = $state('all');

// Filter options for the Select component
const filterOptions = $derived([
	{ value: 'all', label: s('settings.categories.types.all') || 'All types' },
	{
		value: 'core',
		label: s('settings.categories.types.core') || 'Core',
		icon: IconNews,
	},
	{
		value: 'country',
		label: s('settings.categories.types.country') || 'Countries',
		icon: IconWorld,
	},
	{
		value: 'region',
		label: s('settings.categories.types.region') || 'Regions',
		icon: IconMapPin,
	},
	{
		value: 'city',
		label: s('settings.categories.types.city') || 'Cities',
		icon: IconBuilding,
	},
	{
		value: 'topic',
		label: s('settings.categories.types.topic') || 'Topics',
		icon: IconBulb,
	},
	{
		value: 'other',
		label: s('settings.categories.types.other') || 'Other',
		icon: IconDots,
	},
]);

// Initialize categories when they change
$effect(() => {
	if (allCategories.length > 0) {
		untrack(() => {
			categorySettings.setAllCategories(allCategories);
			categorySettings.initWithDefaults();
			loadCategoryMetadata();
			syncFromStore();
		});
	}
});

// Load category metadata for filtering
async function loadCategoryMetadata() {
	try {
		categoryMetadata = await categoryMetadataService.loadMetadata();
	} catch (error) {
		console.error('Failed to load category metadata:', error);
		categoryMetadata = [];
	}
}

// Sync from store when not dragging
$effect(() => {
	if (!isDragging) {
		syncFromStore();
	}
});

function syncFromStore() {
	enabledItems = categorySettings.enabled.map((categoryId) => {
		const category = categorySettings.allCategories.find((cat) => cat.id === categoryId);
		// Fallback to metadata if category not in current batch
		if (!category) {
			const metadata = categoryMetadata.find(
				(meta) => meta.categoryId === categoryId.toLowerCase(),
			);
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

	disabledItems = categorySettings.disabled
		.map((categoryId) => {
			const category = categorySettings.allCategories.find((cat) => cat.id === categoryId);
			// Fallback to metadata if category not in current batch
			if (!category) {
				const metadata = categoryMetadata.find(
					(meta) => meta.categoryId === categoryId.toLowerCase(),
				);
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
		.sort((a, b) => getCategoryDisplayName(a).localeCompare(getCategoryDisplayName(b)));
}

// Get category type for filtering
function getCategoryType(categoryId: string): string {
	// Skip shadow placeholder items created by the drag library
	if (categoryId.startsWith('id:dnd-shadow-placeholder')) {
		return 'other';
	}

	const metadata = categoryMetadata.find((meta) => meta.categoryId === categoryId.toLowerCase());
	if (!metadata) {
		// Don't spam warnings for common categories that might not be in metadata
		if (categoryMetadata.length > 0) {
			console.warn(`No metadata found for category: ${categoryId}`);
		}
		return 'other';
	}
	return metadata.categoryType;
}

// Count categories by type for filter labels
function getCategoryCounts() {
	const counts = {
		all: disabledItems.length,
		core: 0,
		country: 0,
		region: 0,
		city: 0,
		topic: 0,
		other: 0,
	};

	disabledItems.forEach((item) => {
		const type = getCategoryType(item.id);
		if (type in counts) {
			(counts as any)[type]++;
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
				? `${s('settings.categories.allCategories')} (${counts.all})`
				: `${option.label} (${(counts as any)[option.value] || 0})`,
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
	if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
		isDragging = false;
		draggedItemId = null;
	}

	const newItems = e.detail.items;

	// Extract the new enabled categories in their drag order
	const newEnabled = newItems.map((item: any) => item.id);

	// Update enabled/disabled states
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
	if (trigger === TRIGGERS.DROPPED_INTO_ZONE || trigger === TRIGGERS.DROPPED_INTO_ANOTHER) {
		isDragging = false;
		draggedItemId = null;
	}

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
</script>

<div class="space-y-4">
  <div class="mb-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {s("settings.categories.instructions") ||
        "Drag to reorder categories or click to enable/disable them."}
    </p>
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
        <div
          animate:flip={{ duration: flipDurationMs }}
          class="group inline-flex items-center rounded-md bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-200
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
            {getCategoryDisplayName(category)}
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
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {s("settings.categories.disabled") || "Disabled Categories"}
      </h4>
      <div class="w-48">
        <Select
          bind:value={categoryFilter}
          options={filterOptionsWithCounts}
          placeholder={s("settings.categories.filterByType") ||
            "Filter by type..."}
          className="text-xs"
          height="h-8"
          onChange={(value: string) => {
            categoryFilter = value;
          }}
        />
      </div>
    </div>

    <!-- Always use dndzone, but hide filtered items with CSS -->
    <div
      class="min-h-[40px] rounded-lg p-3 flex flex-wrap gap-2 border-2 border-dashed"
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
        {@const isFiltered =
          categoryFilter !== "all" &&
          getCategoryType(category.id) !== categoryFilter}
        {@const isBeingDragged = draggedItemId === category.id}
        <div
          animate:flip={{ duration: flipDurationMs }}
          class="group inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300
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
            {getCategoryDisplayName(category)}
          </span>
        </div>
      {/each}
      {#if disabledItems.length === 0}
        <div
          class="text-sm text-gray-500 dark:text-gray-400 pointer-events-none select-none"
        >
          {s("settings.categories.noDisabled") || "All categories enabled"}
        </div>
      {:else if categoryFilter !== "all" && disabledItems.every((item) => getCategoryType(item.id) !== categoryFilter)}
        <div
          class="text-sm text-gray-500 dark:text-gray-400 pointer-events-none select-none"
        >
          {s("settings.categories.noFiltered") ||
            "No categories of this type are disabled"}
        </div>
      {/if}
    </div>
  </div>

  <div class="text-center">
    <a
      href="https://github.com/kagisearch/kite-public"
      target="_blank"
      class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {s("settings.categories.contribute") ||
        "Suggest new categories on GitHub"}
    </a>
  </div>
</div>
