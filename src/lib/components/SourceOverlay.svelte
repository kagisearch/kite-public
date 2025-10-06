<script lang="ts">
import { IconBuilding, IconMapPin, IconTag, IconUser } from '@tabler/icons-svelte';
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import { s } from '$lib/client/localization.svelte';
import FaviconImage from '$lib/components/common/FaviconImage.svelte';
import { getTimeAgo } from '$lib/utils/getTimeAgo';
import { scrollLock } from '$lib/utils/scrollLock.js';
import 'overlayscrollbars/overlayscrollbars.css';

// Props
interface Props {
	isOpen?: boolean;
	currentSource?: any;
	sourceArticles?: any[];
	currentMediaInfo?: any;
	isLoadingMediaInfo?: boolean;
	onClose?: () => void;
}

let {
	isOpen = false,
	currentSource,
	sourceArticles = [],
	currentMediaInfo,
	isLoadingMediaInfo = false,
	onClose,
}: Props = $props();

// State for showing source info
let showSourceInfo = $state(false);

// Focus management
let dialogElement: HTMLElement | undefined = $state(undefined);
let firstFocusableElement: HTMLElement | undefined = $state(undefined);
let lastFocusableElement: HTMLElement | undefined = $state(undefined);
let previousActiveElement: Element | null = null;

// Use the fetched media info
const mediaInfo = $derived.by(() => {
	return currentMediaInfo || null;
});

// OverlayScrollbars setup
let scrollableElement: HTMLElement | undefined = $state(undefined);
let [initialize, instance] = useOverlayScrollbars({
	defer: true,
	options: {
		scrollbars: {
			autoHide: 'leave',
			autoHideDelay: 100,
		},
	},
});

// Initialize OverlayScrollbars
$effect(() => {
	if (scrollableElement) {
		initialize(scrollableElement);
	}
});

// Handle escape key
function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && isOpen) {
		handleClose();
	}
}

// Focus trap handler
function handleFocusTrap(e: KeyboardEvent) {
	if (e.key !== 'Tab') return;

	if (!firstFocusableElement || !lastFocusableElement) return;

	if (e.shiftKey) {
		// Shift + Tab
		if (document.activeElement === firstFocusableElement) {
			e.preventDefault();
			lastFocusableElement.focus();
		}
	} else {
		// Tab
		if (document.activeElement === lastFocusableElement) {
			e.preventDefault();
			firstFocusableElement.focus();
		}
	}
}

// Get focusable elements
function getFocusableElements(): HTMLElement[] {
	if (!dialogElement) return [];

	const focusableSelectors = [
		'button:not([disabled])',
		'[href]:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"]):not([disabled])',
	];

	return Array.from(dialogElement.querySelectorAll(focusableSelectors.join(', '))) as HTMLElement[];
}

// Update focusable elements
function updateFocusableElements() {
	const focusableElements = getFocusableElements();
	firstFocusableElement = focusableElements[0];
	lastFocusableElement = focusableElements[focusableElements.length - 1];
}

// Handle visibility changes for scroll lock and focus management
$effect(() => {
	if (typeof document !== 'undefined') {
		if (isOpen) {
			// Store the previously active element
			previousActiveElement = document.activeElement;

			// Lock background scroll
			scrollLock.lock();

			// Set up keyboard listeners
			document.addEventListener('keydown', handleKeydown);
			document.addEventListener('keydown', handleFocusTrap);

			// Set initial focus after DOM updates
			setTimeout(() => {
				updateFocusableElements();
				if (firstFocusableElement) {
					firstFocusableElement.focus();
				}
			}, 0);
		} else {
			// Clean up listeners
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('keydown', handleFocusTrap);

			// Unlock background scroll
			scrollLock.unlock();

			// Return focus to the previously active element without scrolling
			if (previousActiveElement && 'focus' in previousActiveElement) {
				(previousActiveElement as HTMLElement).focus({ preventScroll: true });
			}
		}

		return () => {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('keydown', handleFocusTrap);
			scrollLock.unlock();
		};
	}
});

// Handle close
function handleClose() {
	if (onClose) onClose();
}

// Handle backdrop click
function handleBackdropClick(event: MouseEvent) {
	if (event.target === event.currentTarget) {
		handleClose();
	}
}
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 dark:bg-black/70"
    onclick={handleBackdropClick}
    onkeydown={(e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="source-overlay-title"
    tabindex="-1"
  >
    <div
      bind:this={dialogElement}
      class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800"
      role="document"
    >
      <div
        bind:this={scrollableElement}
        class="max-h-[80vh] overflow-y-auto"
        data-overlayscrollbars-initialize
      >
        <header class="mb-4 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <FaviconImage
              domain={currentSource?.name || ""}
              alt={currentSource?.name
                ? `${currentSource.name} favicon`
                : "Generic favicon"}
              class="h-6 w-6 rounded-full"
            />
            <h3
              id="source-overlay-title"
              class="dark:text-dark-text text-xl font-bold"
              dir="auto"
            >
              {currentSource?.name || "Unknown Source"}
            </h3>
          </div>
          <button
            onclick={handleClose}
            class="text-gray-500 hover:text-gray-700 focus-visible-ring rounded dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close source overlay"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <p class="mb-4 text-gray-600 dark:text-gray-400">
          {sourceArticles.length === 1
            ? s("sources.article", {
                count: sourceArticles.length.toString(),
              }) || `${sourceArticles.length} article`
            : s("sources.articles", {
                count: sourceArticles.length.toString(),
              }) || `${sourceArticles.length} articles`}
        </p>

        <div class="space-y-4">
          {#each sourceArticles as article}
            <article class="flex space-x-4">
              <img
                src={article.image || "/svg/placeholder.svg"}
                alt="Article"
                class="h-24 w-24 rounded object-cover"
              />
              <div>
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:underline"
                  onclick={(e) => e.stopPropagation()}
                >
                  <h4 class="dark:text-dark-text font-semibold" dir="auto">
                    {article.title}
                  </h4>
                </a>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {getTimeAgo(article.date)} · {new Date(
                    article.date,
                  ).toLocaleDateString()}
                </p>
              </div>
            </article>
          {/each}
        </div>

        <!-- Source Information -->
        <div class="mt-8 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onclick={() => (showSourceInfo = !showSourceInfo)}
            class="flex w-full items-center justify-between rounded-lg p-2 text-left text-gray-800 hover:bg-gray-50 focus-visible-ring dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <span class="font-semibold">
              {s("source.info.title") || "Source Information"}
            </span>
            <svg
              class="h-5 w-5 transform transition-transform"
              class:rotate-180={showSourceInfo}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>

          {#if showSourceInfo}
            <div class="mt-4">
              {#if isLoadingMediaInfo}
                <div class="py-6 text-center">
                  <div
                    class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"
                  ></div>
                  <p class="text-gray-600 dark:text-gray-400">
                    {s("source.info.loading") ||
                      "Loading source information..."}
                  </p>
                </div>
              {:else if mediaInfo}
                <div class="space-y-6">
                  <!-- Info Grid -->
                  <div class="grid gap-4 sm:grid-cols-2">
                    <!-- Country -->
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 mt-0.5">
                        <IconMapPin class="h-5 w-5 text-gray-500" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div
                          class="font-medium text-gray-700 dark:text-gray-300 text-sm"
                        >
                          {s("source.info.country") || "Country"}
                        </div>
                        <div
                          class="text-gray-600 dark:text-gray-400 break-words"
                          dir="auto"
                        >
                          {mediaInfo?.country}
                        </div>
                      </div>
                    </div>

                    <!-- Owner -->
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 mt-0.5">
                        <IconUser class="h-5 w-5 text-gray-500" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div
                          class="font-medium text-gray-700 dark:text-gray-300 text-sm"
                        >
                          {s("source.info.owner") || "Owner"}
                        </div>
                        <div
                          class="text-gray-600 dark:text-gray-400 break-words"
                          dir="auto"
                        >
                          {mediaInfo?.owner ||
                            s("source.info.notSpecified") ||
                            "Not specified"}
                        </div>
                      </div>
                    </div>

                    <!-- Organization -->
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 mt-0.5">
                        <IconBuilding class="h-5 w-5 text-gray-500" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div
                          class="font-medium text-gray-700 dark:text-gray-300 text-sm"
                        >
                          {s("source.info.organization") || "Organization"}
                        </div>
                        <div
                          class="text-gray-600 dark:text-gray-400 break-words"
                          dir="auto"
                        >
                          {mediaInfo?.organization}
                        </div>
                      </div>
                    </div>

                    <!-- Media Classification -->
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 mt-0.5">
                        <IconTag class="h-5 w-5 text-gray-500" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div
                          class="font-medium text-gray-700 dark:text-gray-300 text-sm"
                        >
                          {s("source.info.mediaClassification") ||
                            "Media Classification"}
                        </div>
                        <div
                          class="text-gray-600 dark:text-gray-400 break-words"
                          dir="auto"
                        >
                          {mediaInfo?.typology}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Description -->
                  {#if mediaInfo?.description}
                    <div
                      class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700"
                    >
                      <h4
                        class="mb-3 font-medium text-gray-700 dark:text-gray-300"
                      >
                        {s("source.info.description") || "Description"}
                      </h4>
                      <p
                        class="text-gray-600 dark:text-gray-400 leading-relaxed"
                        dir="auto"
                      >
                        {mediaInfo?.description}
                      </p>
                    </div>
                  {/if}
                </div>
              {:else}
                <div class="py-6 text-center">
                  <h4
                    class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-200"
                  >
                    {s("source.contribute.title") ||
                      "Help Us Improve Source Information"}
                  </h4>
                  <p class="mb-4 text-gray-600 dark:text-gray-400">
                    {s("source.contribute.description") ||
                      "We need your help to provide detailed information about news sources."}
                  </p>
                  <a
                    href="https://github.com/kagisearch/kite-public"
                    class="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-600"
                  >
                    <svg
                      class="mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                      />
                    </svg>
                    {s("source.contribute.button") || "Contribute on GitHub"}
                  </a>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
