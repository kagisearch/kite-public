<script lang="ts">
import { flip, offset, shift, useFloating } from '@skeletonlabs/floating-ui-svelte';
import { fade } from 'svelte/transition';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';

interface Props {
	show: boolean;
	referenceElement: HTMLElement | null;
}

let { show, referenceElement }: Props = $props();

let localShowTooltip = $state(false);
let timeoutId: NodeJS.Timeout | null = null;
let hasBeenShown = $state(false);

// Floating UI setup for tooltip
const floating = useFloating({
	placement: 'bottom',
	strategy: 'absolute',
	middleware: [
		offset(8), // 8px gap from button
		flip(), // Flip if no space
		shift({ padding: 8 }), // Keep within viewport
	],
});

// Track tooltip visibility
$effect(() => {
	if (show && !localShowTooltip && !hasBeenShown) {
		console.log('Showing temporary category tooltip');
		localShowTooltip = true;
		hasBeenShown = true;

		// Clear any existing timeout
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		// Auto-dismiss after 3 seconds
		timeoutId = setTimeout(() => {
			console.log('Auto-dismissing tooltip after 3 seconds');
			localShowTooltip = false;
			timeoutId = null;
		}, 3000);
	} else if (!show && localShowTooltip) {
		console.log('Hiding temporary category tooltip');
		localShowTooltip = false;

		// Clear timeout if tooltip is being hidden externally
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}
});

// Update floating reference when tooltip should show
$effect(() => {
	if (localShowTooltip && referenceElement && browser) {
		// Manually set the reference element
		floating.elements.reference = referenceElement;
		floating.update();
	}
});
</script>

<!-- Temporary category tooltip -->
{#if localShowTooltip && referenceElement && browser}
  <Portal>
    <div
      bind:this={floating.elements.floating}
      class="absolute top-0 left-0 z-[70] pointer-events-none {floating.isPositioned
        ? 'opacity-100'
        : 'opacity-0 invisible'}"
      style={floating.floatingStyles}
      transition:fade={{ duration: 200 }}
    >
      <!-- Arrow pointing up -->
      <div
        class="absolute -top-2 left-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 w-0 h-0
				border-l-[6px] border-l-transparent
				border-r-[6px] border-r-transparent
				border-b-[8px] border-b-gray-800 dark:border-b-gray-700"
      ></div>

      <!-- Tooltip content -->
      <div
        class="bg-gray-800 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-md shadow-lg max-w-xs"
      >
        <p class="whitespace-nowrap">
          {s("app.temporaryCategoryNotice") ||
            "Temporarily showing this category from shared link"}
        </p>
      </div>
    </div>
  </Portal>
{/if}
