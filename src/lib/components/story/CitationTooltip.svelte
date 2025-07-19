<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { browser } from '$app/environment';
import { useFloating, offset, flip, shift, size } from '@skeletonlabs/floating-ui-svelte';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
import Portal from 'svelte-portal';
import { scrollLock } from '$lib/utils/scrollLock';
import { s } from '$lib/client/localization.svelte';
import CitationItem from './CitationItem.svelte';
import type { Article } from '$lib/types';

interface Props {
	articles: Article[];
	citationNumbers?: number[]; // The actual global citation numbers
	hasCommonKnowledge?: boolean; // Whether [*] appears in the text
	citedItems?: Array<{ article: Article | null; number: number; isCommon?: boolean }>; // All cited items including common knowledge
}

let { articles, citationNumbers, hasCommonKnowledge = false, citedItems = [] }: Props = $props();

// State for dynamic sizing
let tooltipMaxHeight = $state(300);

// Floating UI setup
const floating = useFloating({
	placement: 'bottom-start',
	strategy: 'fixed',
	middleware: [
		offset(8),
		flip({
			fallbackPlacements: ['top-start', 'bottom-end', 'top-end']
		}),
		shift({ 
			padding: 8,
			crossAxis: false
		}),
		size({
			apply({ availableHeight }) {
				const minHeight = 200;
				const maxHeight = Math.min(400, window.innerHeight * 0.6);
				const optimalHeight = Math.min(Math.max(minHeight, availableHeight - 16), maxHeight);
				tooltipMaxHeight = optimalHeight;
			}
		})
	]
});

// State
let showTooltip = $state(false);
let currentTooltipId = $state('');
let isMobile = $state(false);
let highlightedNumber = $state<number | undefined>(undefined);
let hideTimeout: number | null = null;

// OverlayScrollbars instance
let tooltipScrollbars: any = $state();

// Detect mobile device
function detectMobile() {
	return 'ontouchstart' in window || window.innerWidth < 768;
}

// Handle citation interaction
export async function handleCitationInteraction(event: Event, domains: string[], highlightNumber?: number) {
	const target = event.target as HTMLElement;
	
	// Find the citation wrapper or use the target itself (for individual citation numbers)
	const citationWrapper = target.closest('.citation-sources') || target;
	
	if (citationWrapper) {
		const tooltipId = `citations-${domains.join('-')}`;
		
		isMobile = detectMobile();
		
		// For mobile clicks, prevent default
		if (isMobile && event.type === 'click') {
			event.preventDefault();
		}
		
		// For desktop hovers, update highlighted number even if tooltip is already showing
		if (!isMobile && event.type === 'mouseover' && showTooltip && currentTooltipId === tooltipId) {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}
			
			// Update highlighted number and scroll if needed
			if (highlightNumber && highlightedNumber !== highlightNumber) {
				highlightedNumber = highlightNumber;
				setTimeout(() => {
					scrollToHighlightedCitation(highlightNumber);
				}, 50); // Faster scroll
			}
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
			}, 50); // Faster initial scroll
		}
	}
}

// Handle mouse leave from citation sources
export function handleCitationLeave(event: Event) {
	if (isMobile) return;
	
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
}

// Scroll to highlighted citation in tooltip
function scrollToHighlightedCitation(citationNumber: number) {
	if (!tooltipScrollbars?.osInstance || !showTooltip) return;
	
	// Find the highlighted citation element by its actual citation number
	const highlightedElement = floating.elements.floating?.querySelector(`[data-citation-number="${citationNumber}"]`);
	
	if (highlightedElement) {
		// Scroll the highlighted element into view within the tooltip
		highlightedElement.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest'
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
				class="absolute top-0 left-0 z-[2000] w-80 max-w-[min(320px,calc(100vw-16px))] rounded-lg border border-gray-300 bg-white shadow-lg transition-opacity duration-200 dark:border-gray-600 dark:bg-gray-700 {floating.isPositioned ? 'opacity-100' : 'opacity-0 invisible'}"
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
							x: 'hidden',
							y: 'scroll'
						},
						scrollbars: {
							autoHide: 'leave',
							autoHideDelay: 300
						}
					}}
				>
					<div class="p-3">
						<h4 class="mb-3 font-semibold text-gray-800 dark:text-gray-200">Citations</h4>
						
						<div class="space-y-2">
							{#if citedItems.length > 0}
								{@const uniqueItems = (() => {
									const seen = new Set();
									const unique = [];
									
									for (const item of citedItems) {
										if (item.isCommon) {
											// Only add common knowledge once
											if (!seen.has('common')) {
												seen.add('common');
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
									<CitationItem {item} {highlightedNumber} />
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
				onkeydown={(e) => e.key === 'Escape' && closeMobileModal()}
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
					<div class="flex items-center border-b border-gray-200 p-4 dark:border-gray-700">
						<button
							class="mr-3 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
							onclick={closeMobileModal}
							aria-label={s('common.back')}
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
						</button>
						<h3 id="citations-modal-title" class="flex-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
							Source Articles
						</h3>
					</div>

					<!-- Content -->
					<OverlayScrollbarsComponent
						class="flex-1 overflow-hidden"
						defer
						options={{
							overflow: {
								x: 'hidden',
								y: 'scroll'
							},
							scrollbars: {
								autoHide: 'leave',
								autoHideDelay: 300
							}
						}}
					>
						<div class="p-4">
							<h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Citations</h4>
							
							<div class="space-y-3">
								{#if citedItems.length > 0}
									{@const uniqueItems = (() => {
										const seen = new Set();
										const unique = [];
										
										for (const item of citedItems) {
											if (item.isCommon) {
												// Only add common knowledge once
												if (!seen.has('common')) {
													seen.add('common');
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
										<CitationItem {item} {highlightedNumber} isMobile={true} />
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

