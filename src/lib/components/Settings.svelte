<script lang="ts">
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import { s } from '$lib/client/localization.svelte';
import { syncSettingsWatcher } from '$lib/client/sync-settings-watcher.svelte';
import {
	cancelAllSettings,
	saveAllSettings,
	settingsModalState,
} from '$lib/data/settings.svelte.js';
import type { Category } from '$lib/types';
import { createModalBehavior } from '$lib/utils/modalBehavior.svelte';
import { scrollLock } from '$lib/utils/scrollLock.js';
import SettingsCategories from './settings/SettingsCategories.svelte';
import SettingsContentFilter from './settings/SettingsContentFilter.svelte';
import SettingsExperimental from './settings/SettingsExperimental.svelte';
import SettingsGeneral from './settings/SettingsGeneral.svelte';
import SettingsImagePreloading from './settings/SettingsImagePreloading.svelte';
import SettingsSections from './settings/SettingsSections.svelte';
import SettingsSyncPrivacy from './settings/SettingsSyncPrivacy.svelte';
import 'overlayscrollbars/overlayscrollbars.css';
import { fade } from 'svelte/transition';

// Props
interface Props {
	visible?: boolean;
	categories?: Category[];
	onClose?: () => void;
	onShowAbout?: () => void;
}

let { visible = false, categories = [], onClose, onShowAbout }: Props = $props();

// Active tab state - use from settings modal state if provided
let activeTab = $state(settingsModalState.activeTab || 'general');

// Update activeTab when settingsModalState.activeTab changes
$effect(() => {
	if (settingsModalState.activeTab) {
		activeTab = settingsModalState.activeTab;
	}
});

// Debug mode - show preloading tab
let showPreloadingTab = $state(false);

// Load debug tab setting from localStorage
$effect(() => {
	if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
		const savedDebugTab = localStorage.getItem('kite-debug-preloading-tab');
		if (savedDebugTab === 'true') {
			showPreloadingTab = true;
		}
	}
});

// Expose debug method to enable preloading tab
if (typeof window !== 'undefined') {
	(window as any).kiteSettingsDebug = {
		enablePreloadingTab: () => {
			showPreloadingTab = true;
			// Save to localStorage for persistence
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('kite-debug-preloading-tab', 'true');
			}
			return true;
		},
		disablePreloadingTab: () => {
			showPreloadingTab = false;
			// Remove from localStorage
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem('kite-debug-preloading-tab');
			}
			return false;
		},
	};
}

// Modal behavior
const modal = createModalBehavior();

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

// Focus management
let dialogElement: HTMLElement | undefined = $state(undefined);
let firstFocusableElement: HTMLElement | undefined = $state(undefined);
let lastFocusableElement: HTMLElement | undefined = $state(undefined);
let previousActiveElement: Element | null = null;

// Close settings
function handleClose() {
	settingsModalState.isOpen = false;
	if (onClose) onClose();
}

// Handle escape key
function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && visible) {
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

// Handle visibility changes
$effect(() => {
	if (typeof document !== 'undefined') {
		if (visible) {
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

			// Return focus to the previously active element
			if (previousActiveElement && 'focus' in previousActiveElement) {
				(previousActiveElement as HTMLElement).focus();
			}
		}

		return () => {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('keydown', handleFocusTrap);
			// Ensure scroll is unlocked on cleanup
			scrollLock.unlock();
		};
	}
});

// Initialize OverlayScrollbars
$effect(() => {
	if (scrollableElement) {
		initialize(scrollableElement);
	}
});

// Tab change handler
function changeTab(tabName: string) {
	activeTab = tabName;
	// Update focusable elements when tab changes
	setTimeout(() => {
		updateFocusableElements();
	}, 0);
}

// Tab configuration
const tabs = $derived([
	{ id: 'general', labelKey: 'settings.tabs.general', fallback: 'General' },
	{
		id: 'categories',
		labelKey: 'settings.tabs.categories',
		fallback: 'Categories',
	},
	{
		id: 'sections',
		labelKey: 'settings.tabs.sections',
		fallback: 'Sections',
	},
	{
		id: 'contentFilter',
		labelKey: 'settings.tabs.contentFilter',
		fallback: 'Content Filter',
	},
	{
		id: 'syncPrivacy',
		labelKey: 'settings.tabs.syncPrivacy',
		fallback: 'Sync & Privacy',
	},
	{
		id: 'experimental',
		labelKey: 'settings.tabs.experimental',
		fallback: 'Experimental',
	},
	...(showPreloadingTab
		? [{ id: 'preloading', labelKey: '', fallback: 'Preloading (Debug)' }]
		: []),
]);
</script>

{#if visible}
  <div
    class={modal.getBackdropClasses(80)}
    onclick={(e) => modal.handleBackdropClick(e, handleClose)}
    onkeydown={(e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
    transition:fade={{ duration: modal.getTransitionDuration() }}
  >
    <div
      bind:this={dialogElement}
      class="flex h-full w-full flex-col bg-white shadow-xl md:h-auto md:min-h-[700px] md:max-h-[80vh] md:max-w-[52rem] md:rounded-lg md:p-8 dark:bg-gray-800"
      role="document"
      transition:fade={{ duration: modal.getTransitionDuration() }}
    >
      <!-- Header -->
      <header class="flex-shrink-0 bg-white p-4 md:p-0 dark:bg-gray-800">
        <!-- Visually hidden title for screen readers -->
        <h2 id="settings-title" class="sr-only">{s("header.settings") || "Settings"}</h2>

        <div class="mb-1 flex justify-end">
          <button
            onclick={handleClose}
            class="text-gray-500 transition-colors duration-200 hover:text-gray-700 focus-visible-ring rounded dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={s("ui.close") || "Close"}
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
        </div>

        <!-- Tab Navigation -->
        <div
          class="scrollbar-hide flex overflow-x-auto border-b border-gray-200 dark:border-gray-700"
          role="tablist"
          aria-labelledby="settings-title"
        >
          <div class="flex min-w-max">
            {#each tabs as tab}
              <button
                onclick={() => changeTab(tab.id)}
                class="border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible-ring"
                class:border-blue-500={activeTab === tab.id}
                class:text-blue-600={activeTab === tab.id}
                class:dark:text-blue-400={activeTab === tab.id}
                class:border-transparent={activeTab !== tab.id}
                class:text-gray-500={activeTab !== tab.id}
                class:dark:text-gray-400={activeTab !== tab.id}
                aria-selected={activeTab === tab.id}
                aria-controls="settings-content"
                role="tab"
                id="tab-{tab.id}"
              >
                {s(tab.labelKey) || tab.fallback}
              </button>
            {/each}
          </div>
        </div>
      </header>

      <!-- Tab Content -->
      <main
        bind:this={scrollableElement}
        class="mt-6 flex-1 overflow-auto p-4 md:p-0 md:pr-2"
        id="settings-content"
        aria-labelledby="tab-{activeTab}"
        data-overlayscrollbars-initialize
      >
        {#if activeTab === "general"}
          <SettingsGeneral {onShowAbout} />
        {:else if activeTab === "categories"}
          <SettingsCategories {categories} />
        {:else if activeTab === "sections"}
          <SettingsSections />
        {:else if activeTab === "contentFilter"}
          <SettingsContentFilter />
        {:else if activeTab === "syncPrivacy"}
          <SettingsSyncPrivacy />
        {:else if activeTab === "experimental"}
          <SettingsExperimental />
        {:else if activeTab === "preloading"}
          <SettingsImagePreloading />
        {/if}
      </main>
    </div>
  </div>
{/if}
