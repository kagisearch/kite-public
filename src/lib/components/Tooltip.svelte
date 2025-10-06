<script lang="ts">
import { onDestroy, onMount, type Snippet } from 'svelte';
import { fade } from 'svelte/transition';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';

/**
 * Props
 */
let {
	text = '',
	position = 'top',
	disabled = false,
	class: className = '',
	children,
}: {
	text: string;
	position?: 'top' | 'bottom' | 'left' | 'right';
	disabled?: boolean;
	class?: string;
	children: Snippet;
} = $props();

/**
 * Reactive state
 */
let visible = $state(false);
let tooltipElement: HTMLDivElement | null = $state(null);
let triggerElement: HTMLDivElement | null = $state(null);
let timeoutId: number;
let mobileTimeoutId: number;
let resizeObserver: ResizeObserver;
let currentMouseX = 0;
let currentMouseY = 0;
let wasClicked = $state(false);
let isTouchDevice = $state(false);

const SHOW_DELAY = 0; // Delay before showing tooltip in ms

// Add reactive statement to update position when text changes
$effect(() => {
	if (visible && text) {
		// Wait for next frame to ensure DOM is updated
		requestAnimationFrame(updatePosition);
	}
});

// Track previous text to detect meaningful changes
let previousText = $state('');

// Show updated tooltip when text changes significantly after a click
$effect(() => {
	if (text && previousText && text !== previousText && wasClicked) {
		// Text changed after a click - show the updated tooltip
		wasClicked = false; // Reset clicked state
		visible = true;
		requestAnimationFrame(updatePosition);
	}
	previousText = text;
});

$effect(() => {
	if (disabled) {
		visible = false;
	}
});

function isMouseOverTrigger() {
	if (!triggerElement) return false;
	const rect = triggerElement.getBoundingClientRect();
	return (
		currentMouseX >= rect.left &&
		currentMouseX <= rect.right &&
		currentMouseY >= rect.top &&
		currentMouseY <= rect.bottom
	);
}

function handleMouseMove(event: MouseEvent) {
	currentMouseX = event.clientX;
	currentMouseY = event.clientY;
}

function handleScroll() {
	// On mobile, hide tooltip when scrolling
	if (isTouchDevice && visible) {
		visible = false;
	}
}

function handleDocumentClick(event: MouseEvent) {
	// If tooltip is visible and click is outside the trigger element, hide the tooltip
	if (visible && triggerElement && !triggerElement.contains(event.target as Node)) {
		visible = false;
		wasClicked = false; // Reset clicked state when clicking elsewhere
	}
}

// Helper function to check if the target element is a Select or is inside a Select
function isSelectElement(target: HTMLElement): boolean {
	// Check if the element itself or any parent is a select element or has a select-related class
	return Boolean(target.closest('select, [class*="select"], [role="listbox"], .svelte-select'));
}

function handleTriggerClick(event: MouseEvent) {
	// Prevent the click from being handled by the document click handler
	event.stopPropagation();

	// Get target element information
	const target = event.target as HTMLElement;

	// Check if we're clicking on a Select element or its children
	if (isSelectElement(target)) {
		// Don't show tooltip for selects, let the event propagate
		return;
	}

	// Don't show tooltip if the tooltip itself is disabled
	if (disabled) {
		return;
	}

	// On touch devices, simple toggle behavior
	if (isTouchDevice) {
		// Clear any existing timeout
		if (mobileTimeoutId) {
			clearTimeout(mobileTimeoutId);
			mobileTimeoutId = 0;
		}

		// Simple toggle - if visible, hide it; if hidden, show it
		if (visible) {
			visible = false;
		} else {
			visible = true;
			// Update position immediately
			requestAnimationFrame(updatePosition);
		}

		return;
	}

	// For mouse devices, always close the tooltip when clicking the trigger
	visible = false;
	wasClicked = true; // Set clicked state to prevent tooltip from showing on mouseenter again until mouse leaves
}

function handleTouchStart(event: TouchEvent) {
	// Don't process if the tooltip itself is disabled
	if (disabled) return;

	// Check if we're touching a Select element or its children
	if (isSelectElement(event.target as HTMLElement)) {
		// Don't show tooltip for selects
		return;
	}
}

function handleTouchEnd(event: TouchEvent) {
	// Don't process if the tooltip itself is disabled
	if (disabled) return;

	// Check if we're touching a Select element or its children
	if (isSelectElement(event.target as HTMLElement)) {
		// Don't show tooltip for selects
		return;
	}
}

onMount(() => {
	// Detect if we're on a touch device
	if (browser) {
		isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

		window.addEventListener('mousemove', handleMouseMove);
		// Add document click listener to close tooltip when clicking elsewhere
		window.addEventListener('click', handleDocumentClick, true);
		// Add scroll listener to hide tooltip when scrolling (mobile only)
		window.addEventListener('scroll', handleScroll, true);
	}

	// Create resize observer to update position when trigger element resizes
	resizeObserver = new ResizeObserver(() => {
		if (visible) {
			if (!isMouseOverTrigger()) {
				visible = false;
			} else {
				updatePosition();
			}
		}
	});

	if (triggerElement) {
		resizeObserver.observe(triggerElement);
	}
});

onDestroy(() => {
	// Clean up
	if (browser) {
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('click', handleDocumentClick, true);
		window.removeEventListener('scroll', handleScroll, true);
	}
	if (resizeObserver) {
		resizeObserver.disconnect();
	}
	if (timeoutId) {
		clearTimeout(timeoutId);
	}
	if (mobileTimeoutId) {
		clearTimeout(mobileTimeoutId);
	}
	visible = false;
});

/**
 * Positions the tooltip (portaled to <body>) relative to the trigger
 */
function updatePosition() {
	if (!tooltipElement || !triggerElement) return;

	const triggerRect = triggerElement.getBoundingClientRect();
	const tooltipRect = tooltipElement.getBoundingClientRect();

	let left = 0;
	let top = 0;

	// Calculate position relative to viewport
	switch (position) {
		case 'top':
			left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
			top = triggerRect.top - tooltipRect.height - 8;
			break;
		case 'bottom':
			left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
			top = triggerRect.bottom + 8;
			break;
		case 'left':
			left = triggerRect.left - tooltipRect.width - 8;
			top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
			break;
		case 'right':
			left = triggerRect.right + 8;
			top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
			break;
	}

	// Keep tooltip in the viewport with some padding
	const padding = 8;
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	if (left < padding) {
		left = padding;
	} else if (left + tooltipRect.width > viewportWidth - padding) {
		left = viewportWidth - tooltipRect.width - padding;
	}

	if (top < padding) {
		// If there's no space above, force bottom
		if (position === 'top') {
			top = triggerRect.bottom + 8;
		} else {
			top = padding;
		}
	} else if (top + tooltipRect.height > viewportHeight - padding) {
		// If there's no space below, force top
		if (position === 'bottom') {
			top = triggerRect.top - tooltipRect.height - 8;
		} else {
			top = viewportHeight - tooltipRect.height - padding;
		}
	}

	tooltipElement.style.position = 'fixed';
	tooltipElement.style.left = `${left}px`;
	tooltipElement.style.top = `${top}px`;
}

function handleMouseEnter() {
	// Don't show tooltip if disabled, was just clicked, or user is scrolling
	if (disabled || wasClicked) return;

	// For touch devices, we rely on the click handler to show tooltips
	if (isTouchDevice) return;

	timeoutId = window.setTimeout(() => {
		visible = true;
		// Wait for next frame so <div> is actually in the DOM before measuring
		requestAnimationFrame(updatePosition);
	}, SHOW_DELAY);
}

function handleMouseLeave() {
	clearTimeout(timeoutId);
	// Hide tooltip and reset clicked state
	visible = false;
	wasClicked = false;
}
</script>

<!-- 
  1. We wrap the <slot> in a <div> that captures mouseenter/mouseleave/focus/blur. 
  2. The actual tooltip <div> is portaled to <body>.
-->
<div
  bind:this={triggerElement}
  class={className}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocus={handleMouseEnter}
  onblur={handleMouseLeave}
  onclick={handleTriggerClick}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleTriggerClick(e as unknown as MouseEvent);
    }
  }}
  tabindex="-1"
  role="none"
>
  <!-- The content that triggers the tooltip goes here -->
  {@render children()}
</div>

{#if visible && text && !disabled}
  <Portal target="body">
    <div
      bind:this={tooltipElement}
      class="svelte-tooltip z-[9999999] max-w-xs overflow-hidden rounded-md bg-gray-900 dark:bg-gray-800 px-3 py-2 text-xs text-white shadow-lg"
      transition:fade={{ duration: 150 }}
      style="position: fixed; pointer-events: none;"
    >
      <div class="whitespace-pre-line text-left">
        {text}
      </div>
    </div>
  </Portal>
{/if}

<style>
  div {
    transform-origin: center bottom;
  }
</style>
