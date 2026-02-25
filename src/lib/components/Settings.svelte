<script lang="ts">
import {
	IconFilter,
	IconInfoCircle,
	IconLanguage,
	IconLayoutGrid,
	IconNews,
	IconPalette,
	IconUserCircle,
} from '@tabler/icons-svelte';
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import { getContext } from 'svelte';
import Portal from 'svelte-portal';
import { s } from '$lib/client/localization.svelte';
import { syncSettingsWatcher } from '$lib/client/sync-settings-watcher.svelte';
import {
	cancelAllSettings,
	saveAllSettings,
	settingsModalState,
} from '$lib/data/settings.svelte.js';
import { ttsManager } from '$lib/stores/ttsManager.svelte';
import type { Category } from '$lib/types';
import { createModalBehavior } from '$lib/utils/modalBehavior.svelte';
import { scrollLock } from '$lib/utils/scrollLock.js';
import SettingsAbout from './settings/SettingsAbout.svelte';
import SettingsAccount from './settings/SettingsAccount.svelte';
import SettingsAppearance from './settings/SettingsAppearance.svelte';
import SettingsCategories from './settings/SettingsCategories.svelte';
import SettingsFilters from './settings/SettingsFilters.svelte';
import SettingsImagePreloading from './settings/SettingsImagePreloading.svelte';
import SettingsLanguage from './settings/SettingsLanguage.svelte';
import SettingsStories from './settings/SettingsStories.svelte';
import 'overlayscrollbars/overlayscrollbars.css';
import { fade } from 'svelte/transition';

// Feature flag: Enable macOS-style sidebar layout on desktop (disabled by default)
const USE_SIDEBAR_LAYOUT = false;

// Props
interface Props {
	visible?: boolean;
	categories?: Category[];
	onClose?: () => void;
	onShowAbout?: () => void;
}

let { visible = false, categories = [], onClose, onShowAbout }: Props = $props();

// Get session from context to check subscription
const session = getContext<Session | null>('session');

// Active tab state - use from settings modal state if provided
let activeTab = $state(settingsModalState.activeTab || 'appearance');

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
let closeButtonMobile: HTMLElement | undefined = $state(undefined);
let closeButtonDesktop: HTMLElement | undefined = $state(undefined);
let previousActiveElement: Element | null = null;

// Close settings
function handleClose() {
	settingsModalState.isOpen = false;
	if (onClose) onClose();
}

// Handle keyboard events for the modal
function handleModalKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		handleClose();
		return;
	}

	// Focus trap on Tab
	if (e.key === 'Tab' && dialogElement) {
		const focusableSelectors = [
			'button:not([disabled]):not([tabindex="-1"])',
			'[href]:not([disabled])',
			'input:not([disabled])',
			'select:not([disabled])',
			'textarea:not([disabled])',
			'[tabindex="0"]:not([disabled])',
		];

		const focusableElements = Array.from(
			dialogElement.querySelectorAll(focusableSelectors.join(', ')),
		) as HTMLElement[];

		if (focusableElements.length === 0) return;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];
		const activeElement = document.activeElement;

		// If focus is outside modal, bring it in
		if (!dialogElement.contains(activeElement)) {
			e.preventDefault();
			firstElement.focus();
			return;
		}

		if (e.shiftKey && activeElement === firstElement) {
			e.preventDefault();
			lastElement.focus();
		} else if (!e.shiftKey && activeElement === lastElement) {
			e.preventDefault();
			firstElement.focus();
		}
	}
}

// Handle visibility changes
$effect(() => {
	if (typeof document === 'undefined') return;

	if (visible) {
		// Stop all TTS playback when settings opens
		ttsManager.stopAll();

		// Store the previously active element
		previousActiveElement = document.activeElement;

		// Lock background scroll
		scrollLock.lock();

		// Focus the close button after modal renders (whichever is visible)
		requestAnimationFrame(() => {
			// Desktop close button is visible on md+ screens
			const isDesktop = window.matchMedia('(min-width: 768px)').matches;
			const buttonToFocus = isDesktop ? closeButtonDesktop : closeButtonMobile;
			if (buttonToFocus) {
				buttonToFocus.focus();
			}
		});

		// Cleanup only runs when visible changes from true to false, or on destroy
		return () => {
			scrollLock.unlock();

			// Return focus to the previously active element
			if (previousActiveElement && 'focus' in previousActiveElement) {
				(previousActiveElement as HTMLElement).focus();
			}
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
	// Reset scroll position when changing tabs
	if (scrollableElement) {
		scrollableElement.scrollTop = 0;
		// Also reset OverlayScrollbars if initialized
		const osInstance = instance();
		if (osInstance) {
			osInstance.elements().viewport.scrollTop = 0;
		}
	}
}

// Scroll active tab into view (for mobile horizontal tabs)
function scrollTabIntoView(tabId: string) {
	if (!tabsContainer) return;
	const tabElement = tabsContainer.querySelector(`#tab-${tabId}`) as HTMLElement;
	if (tabElement) {
		tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
	}
}

// Handle keyboard navigation for tabs
function handleTabKeydown(e: KeyboardEvent) {
	const currentIndex = tabs.findIndex((t) => t.id === activeTab);
	let newIndex = currentIndex;

	switch (e.key) {
		case 'ArrowRight':
		case 'ArrowDown':
			e.preventDefault();
			newIndex = (currentIndex + 1) % tabs.length;
			break;
		case 'ArrowLeft':
		case 'ArrowUp':
			e.preventDefault();
			newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
			break;
		case 'Home':
			e.preventDefault();
			newIndex = 0;
			break;
		case 'End':
			e.preventDefault();
			newIndex = tabs.length - 1;
			break;
		default:
			return;
	}

	if (newIndex !== currentIndex) {
		const newTab = tabs[newIndex];
		changeTab(newTab.id);
		// Focus and scroll the new tab into view
		setTimeout(() => {
			const tabElement = tabsContainer?.querySelector(`#tab-${newTab.id}`) as HTMLElement;
			if (tabElement) {
				tabElement.focus();
				scrollTabIntoView(newTab.id);
			}
		}, 0);
	}
}

// Tab scroll state for showing gradient indicators (mobile)
let tabsContainer: HTMLElement | undefined = $state(undefined);
let canScrollLeft = $state(false);
let canScrollRight = $state(false);

function updateScrollIndicators() {
	if (!tabsContainer) return;
	canScrollLeft = tabsContainer.scrollLeft > 0;
	canScrollRight =
		tabsContainer.scrollLeft < tabsContainer.scrollWidth - tabsContainer.clientWidth - 1;
}

function scrollTabs(direction: 'left' | 'right') {
	if (!tabsContainer) return;
	const scrollAmount = 150;
	tabsContainer.scrollBy({
		left: direction === 'left' ? -scrollAmount : scrollAmount,
		behavior: 'smooth',
	});
}

$effect(() => {
	if (tabsContainer && visible) {
		updateScrollIndicators();
		tabsContainer.addEventListener('scroll', updateScrollIndicators);
		// Also check on resize
		const resizeObserver = new ResizeObserver(updateScrollIndicators);
		resizeObserver.observe(tabsContainer);
		return () => {
			tabsContainer?.removeEventListener('scroll', updateScrollIndicators);
			resizeObserver.disconnect();
		};
	}
});

// Tab configuration with icons
const tabs = $derived([
	{
		id: 'appearance',
		labelKey: 'settings.tabs.appearance',
		fallback: 'Appearance',
		icon: IconPalette,
	},
	{ id: 'language', labelKey: 'settings.tabs.language', fallback: 'Language', icon: IconLanguage },
	{
		id: 'categories',
		labelKey: 'settings.tabs.categories',
		fallback: 'Categories',
		icon: IconLayoutGrid,
	},
	{ id: 'stories', labelKey: 'settings.tabs.stories', fallback: 'Stories', icon: IconNews },
	{ id: 'filters', labelKey: 'settings.tabs.filters', fallback: 'Filters', icon: IconFilter },
	{ id: 'account', labelKey: 'settings.tabs.account', fallback: 'Account', icon: IconUserCircle },
	{ id: 'about', labelKey: 'settings.tabs.about', fallback: 'About', icon: IconInfoCircle },
	...(showPreloadingTab
		? [{ id: 'preloading', labelKey: '', fallback: 'Preloading (Debug)', icon: IconInfoCircle }]
		: []),
]);
</script>

{#if visible}
  <Portal>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="fixed inset-0 z-modal flex items-center justify-center bg-black/60 dark:bg-black/80"
      onclick={(e) => modal.handleBackdropClick(e, handleClose)}
      onkeydown={handleModalKeydown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      tabindex="-1"
      transition:fade={{ duration: modal.getTransitionDuration() }}
    >
    <div
      bind:this={dialogElement}
      class="flex h-full w-full flex-col bg-white shadow-xl md:h-[85vh] md:max-w-240 md:rounded-xl dark:bg-gray-800"
      class:md:flex-row={USE_SIDEBAR_LAYOUT}
      role="document"
      transition:fade={{ duration: modal.getTransitionDuration() }}
    >
      <!-- Top Navigation Header (Mobile always, Desktop when sidebar disabled) -->
      <header class="shrink-0 bg-white p-4 md:rounded-t-xl dark:bg-gray-800" class:md:hidden={USE_SIDEBAR_LAYOUT}>
        <!-- Header row with title and close button -->
        <div class="mb-3 flex w-full items-center justify-between">
          <h2 id="settings-title" class="font-lufga text-2xl font-medium text-gray-900 dark:text-gray-100">{s("header.settings") || "Settings"}</h2>
          <button
            bind:this={closeButtonMobile}
            onclick={handleClose}
            class="cursor-pointer rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label={s("ui.close") || "Close"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Tab Navigation (horizontal scroll) -->
        <div class="relative">
          <!-- svelte-ignore a11y_interactive_supports_focus -->
          <div
            bind:this={tabsContainer}
            class="scrollbar-hide overflow-x-auto border-b border-gray-200 dark:border-gray-700"
            role="tablist"
            aria-labelledby="settings-title"
            onkeydown={handleTabKeydown}
          >
            <div class="flex min-w-max">
              {#each tabs as tab}
                <button
                  onclick={() => changeTab(tab.id)}
                  class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible-ring whitespace-nowrap"
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
                  tabindex={activeTab === tab.id ? 0 : -1}
                >
                  {#if USE_SIDEBAR_LAYOUT}
                    {@const Icon = tab.icon}
                    <Icon size={18} />
                  {/if}
                  {s(tab.labelKey) || tab.fallback}
                </button>
              {/each}
            </div>
          </div>
          <!-- Left scroll button with gradient fade -->
          {#if canScrollLeft}
            <button
              onclick={() => scrollTabs('left')}
              class="absolute left-0 top-0 bottom-0 flex items-center pl-1 pr-4 bg-linear-to-r from-white via-white to-transparent dark:from-gray-800 dark:via-gray-800 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus-visible-ring rounded-r"
              aria-label="Scroll tabs left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          {/if}
          <!-- Right scroll button with gradient fade -->
          {#if canScrollRight}
            <button
              onclick={() => scrollTabs('right')}
              class="absolute right-0 top-0 bottom-0 flex items-center pr-1 pl-4 bg-linear-to-l from-white via-white to-transparent dark:from-gray-800 dark:via-gray-800 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus-visible-ring rounded-l"
              aria-label="Scroll tabs right"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          {/if}
        </div>
      </header>

      <!-- Desktop Sidebar (only shown when USE_SIDEBAR_LAYOUT is enabled) -->
      {#if USE_SIDEBAR_LAYOUT}
      <aside class="hidden md:flex md:w-48 md:shrink-0 md:flex-col bg-gray-50 dark:bg-gray-900/50 rounded-l-xl border-r border-gray-200 dark:border-gray-700">
        <!-- Visually hidden title for screen readers (desktop) -->
        <h2 id="settings-title-desktop" class="sr-only">{s("header.settings") || "Settings"}</h2>

        <div
          class="flex-1 p-3 space-y-1"
          role="tablist"
          aria-labelledby="settings-title-desktop"
          onkeydown={handleTabKeydown}
          tabindex="-1"
        >
          {#each tabs as tab}
            {@const Icon = tab.icon}
            <button
              onclick={() => changeTab(tab.id)}
              class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors focus-visible-ring
                {activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
              aria-selected={activeTab === tab.id}
              aria-controls="settings-content"
              role="tab"
              id="tab-desktop-{tab.id}"
              tabindex={activeTab === tab.id ? 0 : -1}
            >
              <Icon size={20} class="shrink-0" />
              <span>{s(tab.labelKey) || tab.fallback}</span>
            </button>
          {/each}
        </div>
      </aside>
      {/if}

      <!-- Main Content Area -->
      <div class="flex flex-1 flex-col overflow-hidden" class:md:rounded-r-xl={USE_SIDEBAR_LAYOUT} class:md:rounded-xl={!USE_SIDEBAR_LAYOUT}>
        <!-- Desktop Close Button (only shown with sidebar layout) -->
        <div class="hidden justify-end p-4 pb-0" class:md:flex={USE_SIDEBAR_LAYOUT}>
          <button
            bind:this={closeButtonDesktop}
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

        <!-- Tab Content -->
        <main
          bind:this={scrollableElement}
          class="flex-1 overflow-auto p-4 md:p-6 md:pt-2"
          id="settings-content"
          aria-labelledby="tab-{activeTab}"
          data-overlayscrollbars-initialize
        >
          {#if activeTab === "appearance"}
            <SettingsAppearance />
          {:else if activeTab === "language"}
            <SettingsLanguage />
          {:else if activeTab === "categories"}
            <SettingsCategories {categories} />
          {:else if activeTab === "stories"}
            <SettingsStories />
          {:else if activeTab === "filters"}
            <SettingsFilters />
          {:else if activeTab === "account"}
            <SettingsAccount />
          {:else if activeTab === "about"}
            <SettingsAbout {onShowAbout} />
          {:else if activeTab === "preloading"}
            <SettingsImagePreloading />
          {/if}
        </main>
      </div>
    </div>
  </div>
  </Portal>
{/if}
