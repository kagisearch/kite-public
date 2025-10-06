<script lang="ts">
import { flip, offset, shift, size, useFloating } from '@skeletonlabs/floating-ui-svelte';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
import { onDestroy, onMount } from 'svelte';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import type { Article } from '$lib/types';
import { scrollLock } from '$lib/utils/scrollLock';
import CitationItem from './CitationItem.svelte';

interface Props {
	articles: Article[];
	citationNumbers?: number[]; // The actual global citation numbers
	hasCommonKnowledge?: boolean; // Whether [*] appears in the text
	citedItems?: Array<{
		article: Article | null;
		number: number;
		isCommon?: boolean;
	}>; // All cited items including common knowledge
	storyLocalizer?: (key: string) => string; // Story-specific localization function
}

let {
	articles,
	citationNumbers,
	hasCommonKnowledge = false,
	citedItems = [],
	storyLocalizer = s, // Use regular localization if not provided
}: Props = $props();

// State for dynamic sizing
let tooltipMaxHeight = $state(300);

// Floating UI setup
const floating = useFloating({
	placement: 'bottom-start',
	strategy: 'fixed',
	middleware: [
		offset(8),
		flip({
			fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
		}),
		shift({
			padding: 8,
			crossAxis: false,
		}),
		size({
			apply({ availableHeight }) {
				const minHeight = 200;
				const maxHeight = Math.min(400, window.innerHeight * 0.6);
				const optimalHeight = Math.min(Math.max(minHeight, availableHeight - 16), maxHeight);
				tooltipMaxHeight = optimalHeight;
			},
		}),
	],
});

// State
let showTooltip = $state(false);
let currentTooltipId = $state('');
let isMobile = $state(false);
let highlightedNumber = $state<number | undefined>(undefined);
let hideTimeout: number | null = null;
let isClickToggled = $state(false); // Track if tooltip was toggled by click on desktop
let pendingFocusTimeout: number | null = null; // Delay focus events to avoid conflicts with clicks
let lastTouchTime = 0; // Track last touch to ignore mouseover from touch

// OverlayScrollbars instance
let tooltipScrollbars: any = $state();

// Detect mobile device
function detectMobile() {
	// Check if this is primarily a touch device without mouse support
	// This properly distinguishes between:
	// - Touch-only devices (phones/tablets): mobile behavior
	// - Mouse devices (desktop/laptop, including small screens): desktop behavior
	// - Devices with both (laptops with touchscreen): desktop behavior
	const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	// It's mobile only if it has touch but no mouse (pure touch device)
	return hasTouch && !hasMouse;
}

// Record touch time to ignore subsequent mouseover
export function recordTouch() {
	lastTouchTime = Date.now();
}

// Handle citation interaction
export async function handleCitationInteraction(
	event: Event,
	domains: string[],
	highlightNumber?: number,
) {
	const target = event.target as HTMLElement;

	// Clear any pending focus timeout when any new event comes in
	if (pendingFocusTimeout) {
		clearTimeout(pendingFocusTimeout);
		pendingFocusTimeout = null;
	}

	// Find the citation wrapper or use the target itself (for individual citation numbers)
	const citationWrapper = target.closest('.citation-sources') || target;

	if (citationWrapper) {
		const tooltipId = `citations-${domains.join('-')}`;

		isMobile = detectMobile();

		// For mobile clicks, prevent default and show modal
		if (isMobile && event.type === 'click') {
			event.preventDefault();
		}

		// Desktop click behavior - toggle tooltip
		if (!isMobile && event.type === 'click') {
			event.preventDefault();
			event.stopPropagation(); // Stop propagation to prevent any parent handlers

			// If tooltip is already showing for this citation, hide it
			if (showTooltip && currentTooltipId === tooltipId) {
				hideTooltip();
				return;
			}

			// Mark that this was toggled by click
			isClickToggled = true;
		}

		// For desktop hovers, only proceed if not click-toggled or it's a different tooltip
		if (!isMobile && event.type === 'mouseover') {
			// Ignore mouseover if it comes within 500ms of a touch (touch triggers mouseover)
			if (Date.now() - lastTouchTime < 500) {
				return;
			}

			// Don't interfere with click-toggled tooltips unless it's a different citation
			if (isClickToggled && showTooltip && currentTooltipId === tooltipId) {
				// Just update highlighted number if needed
				if (highlightNumber && highlightedNumber !== highlightNumber) {
					highlightedNumber = highlightNumber;
					setTimeout(() => {
						scrollToHighlightedCitation(highlightNumber);
					}, 50);
				}
				return;
			}

			// Reset click toggle state when hovering over a new citation
			isClickToggled = false;

			// If tooltip is already showing for this citation, just update highlight
			if (showTooltip && currentTooltipId === tooltipId) {
				if (hideTimeout) {
					clearTimeout(hideTimeout);
					hideTimeout = null;
				}

				// Update highlighted number and scroll if needed
				if (highlightNumber && highlightedNumber !== highlightNumber) {
					highlightedNumber = highlightNumber;
					setTimeout(() => {
						scrollToHighlightedCitation(highlightNumber);
					}, 50);
				}
				return;
			}
		}

		// For mobile hover, ignore it completely
		if (isMobile && event.type === 'mouseover') {
			return;
		}

		// Clear any existing timeout
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}

		// Set reference element for floating UI
		floating.elements.reference = citationWrapper;

		// Set highlighted number
		highlightedNumber = highlightNumber;

		// Set initial state
		currentTooltipId = tooltipId;
		showTooltip = true;

		// Auto-scroll to highlighted citation after tooltip is rendered
		if (highlightNumber) {
			setTimeout(() => {
				scrollToHighlightedCitation(highlightNumber);
			}, 50);
		}
	}
}

// Handle mouse leave from citation sources
export function handleCitationLeave(event: Event) {
	if (isMobile) return;

	// If tooltip was toggled by click, don't hide on mouse leave
	if (isClickToggled) return;

	const relatedTarget = (event as MouseEvent).relatedTarget as Node;
	const tooltip = floating.elements.floating;
	const reference = floating.elements.reference;

	// If moving to the tooltip itself, don't hide it
	if (tooltip && relatedTarget && tooltip.contains(relatedTarget)) {
		return;
	}

	// If we're moving to the same citation wrapper, don't hide
	if (relatedTarget && relatedTarget instanceof Element) {
		const targetWrapper = relatedTarget.closest('.citation-sources');
		if (targetWrapper && targetWrapper === reference) {
			return;
		}
	}

	hideTimeout = window.setTimeout(() => {
		hideTooltip();
	}, 150);
}

// Handle tooltip mouse leave
function handleTooltipLeave(event: MouseEvent) {
	if (isMobile) return;

	// If tooltip was toggled by click, don't hide on mouse leave
	if (isClickToggled) return;

	const relatedTarget = event.relatedTarget as Node;
	const reference = floating.elements.reference;

	// If moving back to the citation sources, don't hide
	if (relatedTarget && relatedTarget instanceof Element) {
		const targetWrapper = relatedTarget.closest('.citation-sources');
		if (targetWrapper && targetWrapper === reference) {
			return;
		}
	}

	hideTimeout = window.setTimeout(() => {
		hideTooltip();
	}, 150);
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
	highlightedNumber = undefined;
	isClickToggled = false;
}

// Scroll to highlighted citation in tooltip
function scrollToHighlightedCitation(citationNumber: number) {
	if (!tooltipScrollbars?.osInstance || !showTooltip) return;

	// Find the highlighted citation element by its actual citation number
	const highlightedElement = floating.elements.floating?.querySelector(
		`[data-citation-number="${citationNumber}"]`,
	);

	if (highlightedElement) {
		// Scroll the highlighted element into view within the tooltip
		highlightedElement.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest',
		});

		// Also update the OverlayScrollbars instance
		setTimeout(() => {
			tooltipScrollbars.osInstance()?.update(true);
		}, 25);
	}
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

// Handle click outside to close click-toggled tooltips
function handleClickOutside(event: MouseEvent) {
	if (!isClickToggled || !showTooltip || isMobile) return;

	const target = event.target as Node;
	const tooltip = floating.elements.floating;
	const reference = floating.elements.reference;

	// Check if click is outside both tooltip and reference
	// Note: reference could be a VirtualElement, so check if it has contains method
	if (
		tooltip &&
		!tooltip.contains(target) &&
		reference &&
		'contains' in reference &&
		!reference.contains(target)
	) {
		hideTooltip();
	}
}

// Setup scroll listener
onMount(() => {
	if (browser) {
		window.addEventListener('scroll', hideTooltipOnScroll, { passive: true });
		window.addEventListener('click', handleClickOutside, { capture: true });
	}
});

onDestroy(() => {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
	}
	if (pendingFocusTimeout) {
		clearTimeout(pendingFocusTimeout);
	}
	if (browser) {
		window.removeEventListener('scroll', hideTooltipOnScroll);
		window.removeEventListener('click', handleClickOutside, {
			capture: true,
		});
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
            <h4 class="mb-3 font-semibold text-gray-800 dark:text-gray-200">
              Citations
            </h4>

            <div class="space-y-2">
              {#if citedItems.length > 0}
                {@const uniqueItems = (() => {
                  const seen = new Set();
                  const unique = [];

                  for (const item of citedItems) {
                    if (item.isCommon) {
                      // Only add common knowledge once
                      if (!seen.has("common")) {
                        seen.add("common");
                        unique.push(item);
                      }
                    } else if (item.article) {
                      // Only add each unique article once (by link as unique identifier)
                      const articleKey = item.article.link;
                      if (!seen.has(articleKey)) {
                        seen.add(articleKey);
                        unique.push(item);
                      }
                    }
                  }

                  return unique;
                })()}
                {#each uniqueItems as item}
                  <CitationItem {item} {highlightedNumber} {storyLocalizer} />
                {/each}
              {/if}
            </div>
          </div>
        </OverlayScrollbarsComponent>
      </div>
    </Portal>
  {:else}
    <!-- Mobile Modal -->
    <Portal>
      <div
        class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 dark:bg-black/80"
        onclick={closeMobileModal}
        onkeydown={(e) => e.key === "Escape" && closeMobileModal()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="citations-modal-title"
        tabindex="-1"
      >
        <div
          class="flex h-full w-full flex-col bg-white shadow-xl dark:bg-gray-800"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <!-- Header -->
          <div
            class="flex items-center border-b border-gray-200 p-4 dark:border-gray-700"
          >
            <button
              class="mr-3 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              onclick={closeMobileModal}
              aria-label={storyLocalizer("common.back")}
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
              id="citations-modal-title"
              class="flex-1 text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Source Articles
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
              <h4
                class="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200"
              >
                Citations
              </h4>

              <div class="space-y-3">
                {#if citedItems.length > 0}
                  {@const uniqueItems = (() => {
                    const seen = new Set();
                    const unique = [];

                    for (const item of citedItems) {
                      if (item.isCommon) {
                        // Only add common knowledge once
                        if (!seen.has("common")) {
                          seen.add("common");
                          unique.push(item);
                        }
                      } else if (item.article) {
                        // Only add each unique article once (by link as unique identifier)
                        const articleKey = item.article.link;
                        if (!seen.has(articleKey)) {
                          seen.add(articleKey);
                          unique.push(item);
                        }
                      }
                    }

                    return unique;
                  })()}
                  {#each uniqueItems as item}
                    <CitationItem {item} {highlightedNumber} isMobile={true} {storyLocalizer} />
                  {/each}
                {/if}
              </div>
            </div>
          </OverlayScrollbarsComponent>
        </div>
      </div>
    </Portal>
  {/if}
{/if}
