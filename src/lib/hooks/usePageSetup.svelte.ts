import { onMount } from 'svelte';
import { browser } from '$app/environment';
import { preloadAllLocales } from '$lib/client/storyLocalization.svelte';
import { displaySettings, languageSettings, settingsModalState } from '$lib/data/settings.svelte';
import { kiteDB } from '$lib/db/dexie';
import { batchNotificationService } from '$lib/services/batchNotificationService';
import { dataReloadService } from '$lib/services/dataService';
import { type NavigationParams, UrlNavigationService } from '$lib/services/urlNavigationService';
import { categoryMetadataStore } from '$lib/stores/categoryMetadata.svelte';
import { timeTravel } from '$lib/stores/timeTravel.svelte';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import { toastStore } from '$lib/stores/toast.svelte';

interface PageSetupOptions {
	parseInitialUrl: () => NavigationParams;
	s: (key: string) => string;
	setIsLoadingCategory: (value: boolean) => void;
	setIsSharedArticleView: (value: boolean) => void;
	setSharedArticleIndex: (value: number | null) => void;
	reloadReadStories: () => Promise<void>;
}

/**
 * Handles page initialization and event listeners
 */
export function usePageSetup(options: PageSetupOptions) {
	onMount(() => {
		// Initialize category metadata store
		categoryMetadataStore.init();

		// Preload all locales if UI language is "default"
		if (languageSettings.ui === 'default') {
			preloadAllLocales();
		}

		// Preload search doggo icon
		const doggoImg = new Image();
		doggoImg.src = '/doggo_default.svg';

		// Clean URL by removing data_lang parameter if present
		if (browser && window.location.search.includes('data_lang')) {
			const currentUrl = new URL(window.location.href);
			const cleanedUrl = UrlNavigationService.cleanUrl(currentUrl);
			window.history.replaceState(null, '', cleanedUrl);
		}

		// Check if we're on /about URL
		const isAboutPage = browser && window.location.pathname === '/about';
		if (isAboutPage) {
			displaySettings.showIntro = true;
		}

		// Set intro and onboarding as completed (unless on /about)
		if (browser && !isAboutPage) {
			localStorage.setItem('introShown', 'true');
			localStorage.setItem('kite-onboarding-completed', 'true');
		}

		// Check if this is a shared article URL
		if (browser) {
			const urlParams = options.parseInitialUrl();
			const url = new URL(window.location.href);
			const isShared = url.searchParams.get('shared') === '1';
			if (isShared && urlParams.storyIndex !== null && urlParams.storyIndex !== undefined) {
				options.setIsSharedArticleView(true);
				options.setSharedArticleIndex(urlParams.storyIndex);
			}
		}

		// Clean up legacy data and load read stories
		(async () => {
			await kiteDB.cleanupLegacyData();
			await options.reloadReadStories();
		})();

		// Listen for sync completion events
		// Note: We DON'T reload read stories here because:
		// 1. The UI already updated optimistically when user toggled
		// 2. The sync only applies remote changes that are newer than local (timestamp check)
		// 3. Sequence numbers prevent stale updates from overwriting current state
		const handleSyncComplete = () => {
			// No action needed - optimistic updates + sequence checking handles everything
		};
		window.addEventListener('sync-complete', handleSyncComplete);

		// Handle URL hash navigation
		function handleHashChange() {
			const hash = window.location.hash.slice(1);
			if (hash.startsWith('settings')) {
				const parts = hash.split('/');
				const tab = parts[1] || undefined;
				settingsModalState.isOpen = true;
				settingsModalState.activeTab = tab;
				window.history.replaceState(null, '', window.location.pathname + window.location.search);
			}
		}
		handleHashChange();
		window.addEventListener('hashchange', handleHashChange);

		// Handle popstate for browser navigation
		function handlePopState() {
			if (window.location.pathname === '/about') {
				displaySettings.showIntro = true;
			} else {
				displaySettings.showIntro = false;
			}
		}
		window.addEventListener('popstate', handlePopState);

		// Register data reload callback
		dataReloadService.beforeReload(() => {
			console.log('[UI] Data reload starting - showing loading indicator');
			options.setIsLoadingCategory(true);
		});

		// Subscribe to batch notifications
		const unsubscribeBatchNotifications = batchNotificationService.subscribe((notification) => {
			console.log('[UI] New batch notification received:', notification.batchId);

			toastStore.info(options.s('notification.newBatch.message'), {
				duration: 0,
				action: {
					label: options.s('notification.newBatch.action'),
					onClick: async () => {
						timeTravel.reset();
						timeTravelBatch.clear();
						await dataReloadService.reloadData();
					},
				},
			});
		});

		// Cleanup on unmount
		return () => {
			window.removeEventListener('sync-complete', handleSyncComplete);
			window.removeEventListener('hashchange', handleHashChange);
			window.removeEventListener('popstate', handlePopState);
			unsubscribeBatchNotifications();
		};
	});
}
