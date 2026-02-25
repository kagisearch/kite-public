<script lang="ts">
import { onMount, tick, untrack } from 'svelte';
import { flip } from 'svelte/animate';
import { fade } from 'svelte/transition';
import { dndzone, TRIGGERS } from 'svelte-dnd-action';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { categorySettings, displaySettings } from '$lib/data/settings.svelte.js';
import { categoryMetadataStore } from '$lib/stores/categoryMetadata.svelte';
import type { Category } from '$lib/types';
import { getCategoryDisplayName } from '$lib/utils/category';
import { toCamelCase } from '$lib/utils/string.js';

// Props
interface Props {
	categories?: Category[];
	currentCategory?: string;
	onCategoryChange?: (category: string) => void;
	onCategoryDoubleClick?: (category: string) => void;
	mobilePosition?: 'top' | 'bottom' | 'integrated';
	temporaryCategory?: string | null;
	showTemporaryTooltip?: boolean;
	onTemporaryScrollStart?: () => void;
	onTemporaryScrollEnd?: () => void;
}

let {
	categories = [],
	currentCategory = 'World',
	onCategoryChange,
	onCategoryDoubleClick,
	mobilePosition = 'bottom',
	temporaryCategory = null,
	showTemporaryTooltip = false,
	onTemporaryScrollStart,
	onTemporaryScrollEnd,
}: Props = $props();

// Overflow detection state
let hasOverflow = $state(false);
let tabsElement: HTMLElement = undefined!; // Assigned via bind:this
let temporaryCategoryElement = $state<HTMLElement | null>(null);
let categoryElements = $state<Record<string, HTMLElement>>({});

// Touch device detection - true if device has a fine pointer (mouse) with hover capability
let hasFinePointer = $state(false);

// Drag and drop state
let isDragging = $state(false);
let draggedItemId = $state<string | null>(null);
let hoveredCategory = $state<string | null>(null);
let items = $state<Array<{ id: string; category: Category }>>([]);
const flipDurationMs = 150;

// Helper to get display name with metadata lookup from global store
function getDisplayName(category: Category): string {
	const metadata = categoryMetadataStore.findById(category.id);
	if (!metadata) {
		// Fallback: return the name directly if no metadata found
		return category.name;
	}
	return getCategoryDisplayName(category, metadata);
}

// Expose a function to get the reference element for the tooltip
export function getCategoryElement(categoryId: string): HTMLElement | null {
	return categoryElements[categoryId] || null;
}

// Handle category click
function handleCategoryClick(categoryId: string) {
	if (onCategoryChange) {
		onCategoryChange(categoryId);
	}
}

// Sync items with categories prop
$effect(() => {
	if (!isDragging) {
		items = categories.map((cat) => ({ id: cat.id, category: cat }));
	}
});

// Drag handlers
function handleConsider(e: CustomEvent) {
	const { trigger, id } = e.detail.info;
	if (trigger === TRIGGERS.DRAG_STARTED) {
		isDragging = true;
		draggedItemId = id;
		hoveredCategory = null; // Hide X buttons during drag
	}
	items = e.detail.items;
}

function handleFinalize(e: CustomEvent) {
	isDragging = false;
	draggedItemId = null;
	const newEnabled = e.detail.items.map((item: { id: string }) => item.id);
	categorySettings.setEnabled(newEnabled);
	items = e.detail.items;
}

// Handle category key events
function handleCategoryKeydown(event: KeyboardEvent, categoryId: string) {
	// Handle activation keys
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		handleCategoryClick(categoryId);
		return;
	}

	// Handle arrow key navigation for ARIA tablist pattern
	const currentIndex = categories.findIndex((cat) => cat.id === categoryId);
	let newIndex: number | null = null;

	switch (event.key) {
		case 'ArrowLeft':
		case 'ArrowUp':
			event.preventDefault();
			// Move to previous category, wrap to end
			newIndex = currentIndex > 0 ? currentIndex - 1 : categories.length - 1;
			break;

		case 'ArrowRight':
		case 'ArrowDown':
			event.preventDefault();
			// Move to next category, wrap to start
			newIndex = currentIndex < categories.length - 1 ? currentIndex + 1 : 0;
			break;

		case 'Home':
			event.preventDefault();
			newIndex = 0;
			break;

		case 'End':
			event.preventDefault();
			newIndex = categories.length - 1;
			break;
	}

	// Navigate to the new category if arrow/home/end was pressed
	if (newIndex !== null && newIndex !== currentIndex) {
		const newCategory = categories[newIndex];
		handleCategoryClick(newCategory.id);

		// Focus the new category button after a brief delay
		// This ensures the DOM has updated with the new tabindex
		setTimeout(() => {
			const newButton = categoryElements[newCategory.id];
			if (newButton) {
				newButton.focus();
				// Scroll into view if needed
				newButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
			}
		}, 50);
	}
}

// Check if content overflows
function checkOverflow() {
	if (tabsElement) {
		const newValue = tabsElement.scrollWidth > tabsElement.clientWidth;
		if (newValue !== hasOverflow) {
			hasOverflow = newValue;
		}
	}
}

// Scroll functions
function scrollLeft() {
	if (tabsElement) {
		tabsElement.scrollBy({ left: -200, behavior: 'smooth' });
	}
}

function scrollRight() {
	if (tabsElement) {
		tabsElement.scrollBy({ left: 200, behavior: 'smooth' });
	}
}

// Set up overflow detection and pointer type detection
onMount(() => {
	if (browser) {
		// Check if device has a fine pointer (mouse) with hover capability
		const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
		hasFinePointer = mediaQuery.matches;

		// Listen for changes (e.g., user connects/disconnects mouse)
		const handlePointerChange = (e: MediaQueryListEvent) => {
			hasFinePointer = e.matches;
		};
		mediaQuery.addEventListener('change', handlePointerChange);

		// Initial check
		setTimeout(() => checkOverflow(), 0);

		// Set up mutation observer to watch for changes in category-tabs
		const observer = new MutationObserver(() => {
			setTimeout(() => {
				checkOverflow();
				// Double check after a small delay
				setTimeout(() => checkOverflow(), 100);
			}, 0);
		});

		if (tabsElement) {
			observer.observe(tabsElement, {
				childList: true,
				subtree: true,
				attributes: true,
			});
		}

		// Listen for window resize
		const handleResize = () => {
			checkOverflow();
			setTimeout(() => checkOverflow(), 0);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', handleResize);
			mediaQuery.removeEventListener('change', handlePointerChange);
		};
	}
});

// Watch for categories changes
$effect(() => {
	void categories; // Track changes
	setTimeout(() => checkOverflow(), 0);
});

// Watch for font size changes
$effect(() => {
	void displaySettings.fontSize; // React to font size changes
	// Use a longer delay to ensure CSS changes have taken effect
	setTimeout(() => checkOverflow(), 100);
});

// On initial load, scroll active category to the start of the nav bar
let initialScrollDone = false;
$effect(() => {
	if (currentCategory && browser && tabsElement && !initialScrollDone) {
		initialScrollDone = true;
		tick().then(() => {
			const el = categoryElements[currentCategory];
			if (el && tabsElement) {
				const containerRect = tabsElement.getBoundingClientRect();
				const elRect = el.getBoundingClientRect();
				const scrollLeft = elRect.left - containerRect.left + tabsElement.scrollLeft;
				// Jump most of the way instantly, then smooth the last bit for a fast reveal
				const target = Math.max(0, scrollLeft);
				const jumpTo = Math.max(0, target - 150);
				tabsElement.scrollLeft = jumpTo;
				tabsElement.scrollTo({
					left: target,
					behavior: 'smooth',
				});
			}
		});
	}
});

// Scroll to temporary category when it's added (not when removed)
$effect(() => {
	if (temporaryCategory && browser) {
		// Hide tooltip while scrolling
		if (onTemporaryScrollStart) {
			onTemporaryScrollStart();
		}

		// Wait for DOM to update and category element to be rendered
		tick().then(() => {
			// Add a small delay to ensure layout is complete
			setTimeout(() => {
				const categoryElement = untrack(() => categoryElements[temporaryCategory]);
				if (categoryElement && tabsElement) {
					// Simply scroll all the way to the right (max scroll)
					const maxScroll = tabsElement.scrollWidth - tabsElement.clientWidth;

					tabsElement.scrollTo({
						left: maxScroll,
						behavior: 'smooth',
					});

					// Show tooltip after scroll completes (smooth scroll takes ~300-500ms)
					setTimeout(() => {
						if (onTemporaryScrollEnd) {
							onTemporaryScrollEnd();
						}
					}, 500);
				}
			}, 100);
		});
	}
});
</script>

<div
  class="category-slider-container dark:bg-dark-bg
	md:relative md:bg-transparent md:dark:bg-transparent md:px-0 md:pb-2 md:shadow-none md:start-auto md:end-auto md:top-auto md:bottom-auto
	{mobilePosition === 'integrated'
    ? 'relative bg-white dark:bg-gray-900 px-6 pb-2'
    : 'fixed z-modal bg-white px-6 start-0 end-0'}
	{mobilePosition === 'top'
    ? 'top-[88px] pt-1 pb-0.5 shadow-[0_4px_8px_rgba(0,0,0,0.1)]'
    : ''}
	{mobilePosition === 'bottom'
    ? 'bottom-0 pb-1 shadow-[0_-4px_8px_rgba(0,0,0,0.1)]'
    : ''}"
  class:bottom-safe={mobilePosition === "bottom"}
>
  <div class="relative flex items-center">
    <div class="relative flex w-full items-center">
      <!-- Left scroll button (desktop only) -->
      <button
        onclick={scrollLeft}
        class="relative -ms-1 hidden py-3 pe-4 text-gray-400 transition-colors hover:text-gray-600 focus-visible-ring md:block dark:text-gray-500 dark:hover:text-gray-300"
        class:md:hidden={!hasOverflow}
        aria-label="Scroll categories left"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <!-- Category tabs -->
      <div
        bind:this={tabsElement}
        class="category-tabs scrollbar-hide flex-1 overflow-x-auto flex"
        role="tablist"
        aria-label="News categories"
        onscroll={checkOverflow}
        use:dndzone={{
          items,
          flipDurationMs,
          type: "nav-category",
          dropTargetStyle: {},
          dropTargetClasses: [],
          morphDisabled: true,
          dragDisabled: items.length <= 1 || !hasFinePointer,
          transformDraggedElement: (el) => {
            if (el) {
              el.style.outline = 'none';
              el.style.boxShadow = 'none';
              el.style.border = 'none';
            }
          },
        }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
      >
        {#each items as item (item.id)}
          {@const category = item.category}
          <div
            bind:this={categoryElements[category.id]}
            animate:flip={{ duration: flipDurationMs }}
            class="category-tab-wrapper {draggedItemId === item.id ? 'opacity-50' : ''}"
            class:dragging={isDragging}
            role="tab"
            tabindex={currentCategory === category.id ? 0 : -1}
            aria-selected={currentCategory === category.id}
            aria-controls="category-{category.id}"
            onclick={() => handleCategoryClick(category.id)}
            onkeydown={(e) => handleCategoryKeydown(e, category.id)}
            ondblclick={() =>
              displaySettings.storyExpandMode !== "never" &&
              onCategoryDoubleClick?.(category.id)}
          >
            <span
              class="category-tab whitespace-nowrap ps-4 pe-1 py-2 md:py-3 text-base font-medium transition-colors focus-visible-ring
                {currentCategory === category.id ? 'active text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}"
            >
              {getDisplayName(category)}
            </span>
          </div>
        {/each}
      </div>

      <!-- Right scroll button (desktop only) -->
      <button
        onclick={scrollRight}
        class="relative -me-1 hidden py-3 ps-4 text-gray-400 transition-colors hover:text-gray-600 focus-visible-ring md:block dark:text-gray-500 dark:hover:text-gray-300"
        class:md:hidden={!hasOverflow}
        aria-label="Scroll categories right"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>

  </div>
</div>

<style>
  .category-tabs {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Add safe area padding for mobile browsers */
  .bottom-safe {
    padding-bottom: env(safe-area-inset-bottom, 0.25rem);
  }

  /* Ensure the container accounts for safe areas */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .bottom-safe {
      padding-bottom: calc(0.25rem + env(safe-area-inset-bottom));
    }
  }

  .category-tabs::-webkit-scrollbar {
    display: none;
  }

  .category-tab {
    flex-shrink: 0;
    min-width: fit-content;
  }

  .category-tab:first-child {
    margin-left: 0;
  }

  .category-tab:last-child {
    margin-right: 0;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Drag and drop wrapper */
  .category-tab-wrapper {
    position: relative;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    cursor: grab;
    border-radius: 0.25rem;
  }

  .category-tab-wrapper:active {
    cursor: grabbing;
  }

  /* Override svelte-dnd-action default styling - must use :global for library-added classes */
  :global([data-is-dnd-shadow-item-hint]),
  :global(.svelte-dnd-action-dragged-el),
  :global([data-is-dnd-shadow-item]),
  .category-tab-wrapper:global([data-is-dnd-shadow-item-hint]),
  .category-tab-wrapper:global(.svelte-dnd-action-dragged-el) {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
  }

  .category-tabs {
    outline: none !important;
    transition: background-color 0.15s ease;
  }

  /* Remove any focus outline during drag */
  .category-tabs:focus,
  .category-tabs:focus-visible,
  .category-tab-wrapper:focus,
  .category-tab-wrapper:focus-visible {
    outline: none !important;
  }

  /* Subtle background change during drag instead of outline */
  .category-tabs:global(.svelte-dnd-action-dragged-item-parent) {
    background-color: rgba(59, 130, 246, 0.05);
    border-radius: 0.375rem;
    outline: none !important;
  }

  :global(.dark) .category-tabs:global(.svelte-dnd-action-dragged-item-parent) {
    background-color: rgba(59, 130, 246, 0.1);
  }
</style>
