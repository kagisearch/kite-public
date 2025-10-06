<script lang="ts">
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { scrollLock } from '$lib/utils/scrollLock';
import 'overlayscrollbars/overlayscrollbars.css';
import { onDestroy, onMount } from 'svelte';
import { fade, fly } from 'svelte/transition';

// Props
interface Props {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
	position?: 'center' | 'top' | 'bottom';
	closeOnBackdrop?: boolean;
	closeOnEscape?: boolean;
	showCloseButton?: boolean;
	lockScroll?: boolean;
	zIndex?: number;
	ariaLabel?: string;
	class?: string;
	children?: any;
}

let {
	isOpen = false,
	onClose,
	title = '',
	size = 'md',
	position = 'center',
	closeOnBackdrop = true,
	closeOnEscape = true,
	showCloseButton = true,
	lockScroll = true,
	zIndex = 1000,
	ariaLabel,
	class: className = '',
	children,
}: Props = $props();

// Modal element references
let modalElement: HTMLDivElement | undefined = $state();
let contentElement: HTMLDivElement | undefined = $state();
let previousActiveElement: Element | null = null;

// OverlayScrollbars setup
let [initialize] = useOverlayScrollbars({
	defer: true,
	options: {
		scrollbars: {
			autoHide: 'scroll',
			theme: 'os-theme-dark os-theme-light',
		},
	},
});

// Size classes
const sizeClasses = {
	sm: 'max-w-sm',
	md: 'max-w-2xl',
	lg: 'max-w-4xl',
	xl: 'max-w-6xl',
	full: 'max-w-full mx-4',
};

// Position classes
const positionClasses = {
	center: 'items-center justify-center',
	top: 'items-start justify-center pt-16',
	bottom: 'items-end justify-center',
};

// Transition config
const backdropTransition = { duration: 150 };
const modalTransition =
	position === 'bottom'
		? { y: 200, duration: 200 }
		: position === 'top'
			? { y: -50, duration: 200 }
			: { duration: 200 };

// Handle backdrop click
function handleBackdropClick(e: MouseEvent) {
	if (closeOnBackdrop && e.target === e.currentTarget) {
		onClose();
	}
}

// Handle escape key
function handleKeydown(e: KeyboardEvent) {
	if (closeOnEscape && e.key === 'Escape' && isOpen) {
		e.preventDefault();
		onClose();
	}
}

// Focus management
function trapFocus(e: KeyboardEvent) {
	if (!modalElement || e.key !== 'Tab') return;

	const focusableElements = modalElement.querySelectorAll<HTMLElement>(
		'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), ' +
			'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
	);

	if (focusableElements.length === 0) return;

	const firstElement = focusableElements[0];
	const lastElement = focusableElements[focusableElements.length - 1];

	if (e.shiftKey && document.activeElement === firstElement) {
		e.preventDefault();
		lastElement.focus();
	} else if (!e.shiftKey && document.activeElement === lastElement) {
		e.preventDefault();
		firstElement.focus();
	}
}

// Manage scroll lock and focus
$effect(() => {
	if (browser) {
		if (isOpen) {
			// Store current active element
			previousActiveElement = document.activeElement;

			// Lock scroll if enabled
			if (lockScroll) {
				scrollLock.lock();
			}

			// Focus modal after a tick
			setTimeout(() => {
				if (modalElement) {
					modalElement.focus();
				}
			}, 50);
		} else {
			// Unlock scroll
			if (lockScroll) {
				scrollLock.unlock();
			}

			// Restore focus without scrolling
			if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
				previousActiveElement.focus({ preventScroll: true });
			}
		}
	}
});

// Initialize OverlayScrollbars on content element
$effect(() => {
	if (contentElement && isOpen) {
		initialize(contentElement);
	}
});

// Cleanup on destroy
onDestroy(() => {
	if (browser && isOpen && lockScroll) {
		scrollLock.unlock();
	}
});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 flex {positionClasses[
      position
    ]} p-0 sm:p-4"
    style="z-index: {zIndex}"
    onclick={handleBackdropClick}
    transition:fade={backdropTransition}
  >
    <!-- Modal -->
    <div
      bind:this={modalElement}
      class="relative w-full h-full sm:h-auto {sizeClasses[size]} {position ===
      'bottom'
        ? 'rounded-t-2xl'
        : 'sm:rounded-lg'} bg-white shadow-xl dark:bg-gray-800 flex flex-col {className}"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || "Modal dialog"}
      aria-labelledby={title ? "modal-title" : undefined}
      tabindex="-1"
      onkeydown={trapFocus}
      onclick={(e) => e.stopPropagation()}
      transition:fly={modalTransition}
    >
      <!-- Header -->
      {#if title || showCloseButton}
        <div
          class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700"
        >
          {#if title}
            <h2
              id="modal-title"
              class="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {title}
            </h2>
          {:else}
            <div></div>
          {/if}

          {#if showCloseButton}
            <button
              onclick={onClose}
              class="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 focus-visible-ring"
              aria-label={s("ui.close") || "Close"}
            >
              <svg
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          {/if}
        </div>
      {/if}

      <!-- Content -->
      <div
        bind:this={contentElement}
        class="modal-content flex-1 overflow-y-auto"
        data-overlayscrollbars-initialize
      >
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Default content styles - can be overridden by parent */
  .modal-content {
    max-height: calc(100vh - 8rem);
    overflow-y: auto;
  }

  @media (max-width: 640px) {
    .modal-content {
      max-height: calc(100vh - 4rem);
    }
  }
</style>
