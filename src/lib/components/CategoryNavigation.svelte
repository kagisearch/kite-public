<script lang="ts">
import { onMount } from 'svelte';
import { fade } from 'svelte/transition';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { displaySettings } from '$lib/data/settings.svelte.js';
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
}

let {
	categories = [],
	currentCategory = 'World',
	onCategoryChange,
	onCategoryDoubleClick,
	mobilePosition = 'bottom',
	temporaryCategory = null,
	showTemporaryTooltip = false,
}: Props = $props();

// Overflow detection state
let hasOverflow = $state(false);
let tabsElement: HTMLElement;
let temporaryCategoryElement = $state<HTMLElement | null>(null);
let categoryElements = $state<Record<string, HTMLElement>>({});

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

// Set up overflow detection
onMount(() => {
	if (browser) {
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
		};
	}
});

// Watch for categories changes
$effect(() => {
	categories;
	setTimeout(() => checkOverflow(), 0);
});

// Watch for font size changes
$effect(() => {
	displaySettings.fontSize; // React to font size changes
	// Use a longer delay to ensure CSS changes have taken effect
	setTimeout(() => checkOverflow(), 100);
});
</script>

<div
  class="category-slider-container dark:bg-dark-bg
	md:relative md:bg-transparent md:dark:bg-transparent md:px-0 md:py-2 md:shadow-none md:start-auto md:end-auto md:top-auto md:bottom-auto
	{mobilePosition === 'integrated'
    ? 'relative bg-white dark:bg-gray-900 px-6 pb-2'
    : 'fixed z-[60] bg-white px-6 start-0 end-0'}
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
        class="category-tabs scrollbar-hide flex-1 overflow-x-auto"
        role="tablist"
        aria-label="News categories"
        onscroll={checkOverflow}
      >
        {#each categories as category (category.id)}
          <button
            bind:this={categoryElements[category.id]}
            role="tab"
            tabindex={currentCategory === category.id ? 0 : -1}
            aria-selected={currentCategory === category.id}
            aria-controls="category-{category.id}"
            class="category-tab whitespace-nowrap cursor-pointer px-4 py-2 md:py-3 text-base font-medium transition-colors focus-visible-ring relative"
            class:active={currentCategory === category.id}
            class:text-blue-600={currentCategory === category.id}
            class:border-b-2={currentCategory === category.id}
            class:border-blue-600={currentCategory === category.id}
            class:text-gray-600={currentCategory !== category.id}
            class:hover:text-gray-800={currentCategory !== category.id}
            class:dark:text-gray-400={currentCategory !== category.id}
            class:dark:hover:text-gray-200={currentCategory !== category.id}
            onclick={() => handleCategoryClick(category.id)}
            onkeydown={(e) => handleCategoryKeydown(e, category.id)}
            ondblclick={() =>
              displaySettings.storyExpandMode !== "never" &&
              onCategoryDoubleClick?.(category.id)}
          >
            {getCategoryDisplayName(category)}
          </button>
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
</style>
