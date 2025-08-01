<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { toCamelCase } from '$lib/utils/string.js';
import { fontSize } from '$lib/stores/fontSize.svelte.js';
import { settings } from '$lib/stores/settings.svelte.js';
import type { Category } from '$lib/types';
import { onMount } from 'svelte';
import { browser } from '$app/environment';
import { getCategoryDisplayName } from '$lib/utils/category';
import { fade } from 'svelte/transition';

// Props
interface Props {
	categories?: Category[];
	currentCategory?: string;
	onCategoryChange?: (category: string) => void;
	onCategoryDoubleClick?: (category: string) => void;
	mobilePosition?: 'top' | 'bottom';
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
	showTemporaryTooltip = false
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
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		handleCategoryClick(categoryId);
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
				attributes: true
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
	fontSize.current; // React to font size changes
	// Use a longer delay to ensure CSS changes have taken effect
	setTimeout(() => checkOverflow(), 100);
});

</script>

<div class="category-slider-container dark:bg-dark-bg 
	md:relative md:bg-transparent md:dark:bg-transparent md:px-0 md:py-2 md:shadow-none md:left-auto md:right-auto md:top-auto md:bottom-auto
	fixed z-[60] bg-white px-6 left-0 right-0
	{mobilePosition === 'top' ? 'top-0 pt-1 pb-0.5 shadow-[0_4px_8px_rgba(0,0,0,0.1)]' : 'bottom-0 pb-1 shadow-[0_-4px_8px_rgba(0,0,0,0.1)]'}"
	class:bottom-safe={mobilePosition === 'bottom'}>
	<div class="relative flex items-center">
		<div class="relative flex w-full items-center">
			<!-- Left scroll button (desktop only) -->
			<button
				onclick={scrollLeft}
				class="relative -ml-1 hidden py-3 pr-4 text-gray-400 transition-colors hover:text-gray-600 focus-visible-ring md:block dark:text-gray-500 dark:hover:text-gray-300"
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
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
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
						ondblclick={() => settings.storyExpandMode !== 'never' && onCategoryDoubleClick?.(category.id)}
					>
						{getCategoryDisplayName(category)}
					</button>
				{/each}
			</div>

			<!-- Right scroll button (desktop only) -->
			<button
				onclick={scrollRight}
				class="relative -mr-1 hidden py-3 pl-4 text-gray-400 transition-colors hover:text-gray-600 focus-visible-ring md:block dark:text-gray-500 dark:hover:text-gray-300"
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
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
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