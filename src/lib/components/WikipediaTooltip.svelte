<script lang="ts">
import { arrow, flip, offset, shift, size, useFloating } from '@skeletonlabs/floating-ui-svelte';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
import { onDestroy, onMount } from 'svelte';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { fetchWikipediaContent, type WikipediaContent } from '$lib/services/wikipediaService';
import { scrollLock } from '$lib/utils/scrollLock';

interface Props {
	onWikipediaClick?: (title: string, content: string, imageUrl?: string) => void;
}

let { onWikipediaClick }: Props = $props();

// State for dynamic sizing
let tooltipMaxHeight = $state(300);

// Floating UI setup
const floating = useFloating({
	placement: 'bottom-start',
	strategy: 'fixed', // Use fixed positioning since we're using Portal
	middleware: [
		offset(8), // 8px gap from trigger
		flip({
			fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
		}), // Flip to opposite side if no space
		shift({
			padding: 8,
			crossAxis: false, // Don't shift on cross axis to prevent centering
		}), // Shift within viewport with padding
		size({
			apply({ availableHeight, availableWidth: _availableWidth, elements: _elements }) {
				// Calculate optimal height based on available space
				// Min: 200px, Max: 500px or 60% of viewport height
				const minHeight = 200;
				const maxHeight = Math.min(500, window.innerHeight * 0.6);
				const optimalHeight = Math.min(Math.max(minHeight, availableHeight - 16), maxHeight);
				tooltipMaxHeight = optimalHeight;
			},
		}),
		// arrow({ element: () => arrowElement }) // Arrow pointing to trigger - temporarily removed
	],
});

// State
let showTooltip = $state(false);
let tooltipTitle = $state('');
let tooltipContent = $state('');
let tooltipImage = $state('');
let tooltipFullImage = $state('');
let tooltipWikiUrl = $state('');
let currentTooltipId = $state('');
let isMobile = $state(false);
let isLoading = $state(false);

// Elements
let arrowElement: HTMLElement;
let hideTimeout: number | null = null;

// OverlayScrollbars instance
let tooltipScrollbars: any = $state();

// Detect mobile device
function detectMobile() {
	return 'ontouchstart' in window || window.innerWidth < 768;
}

// Handle Wikipedia link interaction
export async function handleWikipediaInteraction(event: Event) {
	const target = event.target as HTMLElement;

	// Find the actual Wikipedia link, even if we clicked on a child element
	const wikiLink = target.closest('a[data-wiki-id]') as HTMLElement;

	if (wikiLink) {
		const title = wikiLink.getAttribute('title') || wikiLink.textContent || '';
		const wikiId = wikiLink.getAttribute('data-wiki-id') || '';
		const href = wikiLink.getAttribute('href') || '';
		const tooltipId = `${wikiId}-${title}`;

		isMobile = detectMobile();

		// For mobile clicks, prevent default link behavior
		if (isMobile && event.type === 'click') {
			event.preventDefault();
		}

		// For desktop hovers, skip if already showing same tooltip
		if (!isMobile && event.type === 'mouseover' && showTooltip && currentTooltipId === tooltipId) {
			// Cancel any pending hide timeout since we're still on the same element
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}
			return;
		}

		// Clear any existing timeout
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}

		// Set reference element for floating UI - use the actual link element
		floating.elements.reference = wikiLink;

		// Set initial state
		currentTooltipId = tooltipId;
		tooltipTitle = title;
		tooltipContent = '';
		tooltipImage = '';
		tooltipFullImage = '';
		tooltipWikiUrl = href || `https://en.wikipedia.org/wiki/${wikiId}`;
		isLoading = true;

		// Show tooltip - the floating element will be bound when the template renders
		showTooltip = true;

		// Debug logging (commented out)
		// setTimeout(() => {
		//   console.log('Floating UI state after timeout:', {
		//     reference: floating.elements.reference,
		//     floating: floating.elements.floating,
		//     isPositioned: floating.isPositioned,
		//     showTooltip
		//   });
		// }, 0);

		// console.log(`Wiki interaction - Title: "${title}", WikiId: "${wikiId}"`);

		// Fetch Wikipedia content
		try {
			const loadedData = await fetchWikipediaContent(wikiId);
			// Update tooltip if it's still showing for the same ID
			if (showTooltip && currentTooltipId === tooltipId) {
				tooltipContent = loadedData?.extract || 'No summary available.';
				tooltipImage = loadedData?.thumbnail?.source || '';
				tooltipFullImage = loadedData?.originalImage?.source || tooltipImage;
				tooltipWikiUrl = loadedData?.wikiUrl || tooltipWikiUrl;
				isLoading = false;

				// Update scrollbars after content loads
				setTimeout(() => {
					if (tooltipScrollbars?.osInstance) {
						tooltipScrollbars.osInstance().update(true);
					}
				}, 10);
			}
		} catch (error) {
			console.error('Error loading Wikipedia content:', error);
			if (showTooltip && currentTooltipId === tooltipId) {
				tooltipContent = 'Failed to load Wikipedia content.';
				isLoading = false;
			}
		}
	}
}

// Handle mouse leave from Wikipedia link
export function handleWikipediaLeave(event: Event) {
	if (isMobile) return; // Mobile tooltips are manually closed

	const relatedTarget = (event as MouseEvent).relatedTarget as Node;
	const tooltip = floating.elements.floating;
	const reference = floating.elements.reference;

	// If moving to the tooltip itself, don't hide it
	if (tooltip && relatedTarget && tooltip.contains(relatedTarget)) {
		return;
	}

	// Key improvement: Check if we're moving to ANY part of the same Wikipedia link
	// This treats the entire link as a single hover zone
	if (relatedTarget && relatedTarget instanceof Element) {
		const targetWikiLink = relatedTarget.closest('a[data-wiki-id]');
		const currentWikiLink = reference as Element;

		// If we're moving to the same Wikipedia link (same data-wiki-id), don't hide
		if (
			targetWikiLink &&
			currentWikiLink &&
			targetWikiLink.getAttribute('data-wiki-id') === currentWikiLink.getAttribute('data-wiki-id')
		) {
			return;
		}
	}

	// Simple timeout with reduced delay since we have unified hover zone
	hideTimeout = window.setTimeout(() => {
		hideTooltip();
	}, 150); // Short delay for smooth UX
}

// Handle tooltip mouse leave
function handleTooltipLeave(event: MouseEvent) {
	if (isMobile) return;

	const relatedTarget = event.relatedTarget as Node;
	const reference = floating.elements.reference;

	// If moving back to the Wikipedia link, don't hide
	if (relatedTarget && relatedTarget instanceof Element) {
		const targetWikiLink = relatedTarget.closest('a[data-wiki-id]');
		const currentWikiLink = reference as Element;

		// If we're moving to the same Wikipedia link (same data-wiki-id), don't hide
		if (
			targetWikiLink &&
			currentWikiLink &&
			targetWikiLink.getAttribute('data-wiki-id') === currentWikiLink.getAttribute('data-wiki-id')
		) {
			return;
		}
	}

	// Simple timeout - if we're truly leaving, hide the tooltip
	hideTimeout = window.setTimeout(() => {
		hideTooltip();
	}, 150); // Consistent short delay
}

// Handle tooltip mouse enter (cancel hide timeout)
function handleTooltipEnter() {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
}

// Hide tooltip
function hideTooltip() {
	showTooltip = false;
	currentTooltipId = '';
	isLoading = false;
}

// Close mobile modal
function closeMobileModal() {
	hideTooltip();
}

// Lock/unlock page scroll for mobile
$effect(() => {
	if (isMobile && showTooltip) {
		scrollLock.lock();
	} else {
		scrollLock.unlock();
	}
});

// Hide tooltip on scroll (desktop only)
function hideTooltipOnScroll() {
	if (!isMobile && showTooltip) {
		hideTooltip();
	}
}

// Setup scroll listener
onMount(() => {
	if (browser) {
		window.addEventListener('scroll', hideTooltipOnScroll, { passive: true });
	}
});

onDestroy(() => {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
	}
	if (browser) {
		window.removeEventListener('scroll', hideTooltipOnScroll);
	}
	// Make sure scroll is unlocked
	if (showTooltip) {
		scrollLock.unlock();
	}
});
</script>

{#if showTooltip}
  {#if !isMobile}
    <!-- Desktop Tooltip -->
    <Portal>
      <div
        bind:this={floating.elements.floating}
        class="absolute top-0 left-0 z-[2000] w-80 max-w-[min(320px,calc(100vw-16px))] rounded-lg border border-gray-300 bg-white shadow-lg transition-opacity duration-200 dark:border-gray-600 dark:bg-gray-700 {floating.isPositioned
          ? 'opacity-100'
          : 'opacity-0 invisible'}"
        style={floating.floatingStyles}
        onmouseenter={handleTooltipEnter}
        onmouseleave={handleTooltipLeave}
        role="tooltip"
      >
        <!-- Arrow - temporarily commented out -->
        <!-- <div
					bind:this={arrowElement}
					class="arrow border border-gray-300 dark:border-gray-600"
					style={floating.arrowStyles}
					data-placement={floating.placement}
				></div> -->

        <!-- Content -->
        <OverlayScrollbarsComponent
          bind:this={tooltipScrollbars}
          class="w-full overflow-hidden transition-[max-height] duration-200"
          style="max-height: {tooltipMaxHeight}px"
          defer
          options={{
            overflow: {
              x: "hidden",
              y: "scroll",
            },
            scrollbars: {
              autoHide: "leave",
              autoHideDelay: 300,
            },
          }}
        >
          <div class="p-3">
            <h4
              class="mb-2 font-semibold text-gray-800 dark:text-gray-200 break-words"
            >
              {tooltipTitle}
            </h4>

            {#if isLoading}
              <div
                class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
              >
                <div
                  class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"
                ></div>
                <span>Loading...</span>
              </div>
            {:else}
              {#if tooltipImage}
                <img
                  src={tooltipImage}
                  alt={tooltipTitle}
                  class="mb-2 w-full rounded h-auto object-contain"
                />
              {/if}
              <p class="text-sm text-gray-600 dark:text-gray-400 break-words" dir="auto">
                {tooltipContent}
              </p>
            {/if}
          </div>
        </OverlayScrollbarsComponent>
      </div>
    </Portal>
  {:else}
    <!-- Mobile Modal (Fullscreen) -->
    <Portal>
      <div
        class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 dark:bg-black/80"
        onclick={closeMobileModal}
        onkeydown={(e) => e.key === "Escape" && closeMobileModal()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wikipedia-modal-title"
        tabindex="-1"
      >
        <div
          class="flex h-full w-full flex-col bg-white shadow-xl dark:bg-gray-800"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <!-- Header with arrow back button -->
          <div
            class="flex items-center border-b border-gray-200 p-4 dark:border-gray-700"
          >
            <button
              class="mr-3 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              onclick={closeMobileModal}
              aria-label={s("common.back")}
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h3
              id="wikipedia-modal-title"
              class="flex-1 text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {tooltipTitle}
            </h3>
          </div>

          <!-- Content -->
          <OverlayScrollbarsComponent
            class="flex-1 overflow-hidden"
            defer
            options={{
              overflow: {
                x: "hidden",
                y: "scroll",
              },
              scrollbars: {
                autoHide: "leave",
                autoHideDelay: 300,
              },
            }}
          >
            <div class="p-4">
              {#if isLoading}
                <div
                  class="flex items-center justify-center space-x-2 py-8 text-gray-500 dark:text-gray-400"
                >
                  <div
                    class="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"
                  ></div>
                  <span>Loading Wikipedia content...</span>
                </div>
              {:else}
                {#if tooltipFullImage || tooltipImage}
                  <img
                    src={tooltipFullImage || tooltipImage}
                    alt={tooltipTitle}
                    class="mb-4 h-48 w-full rounded-lg object-cover"
                  />
                {/if}
                <p class="text-gray-700 dark:text-gray-300" dir="auto">{tooltipContent}</p>
                {#if tooltipWikiUrl}
                  <a
                    href={tooltipWikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-4 inline-block rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    {s("wikipedia.readMore")}
                  </a>
                {/if}
              {/if}
            </div>
          </OverlayScrollbarsComponent>
        </div>
      </div>
    </Portal>
  {/if}
{/if}
