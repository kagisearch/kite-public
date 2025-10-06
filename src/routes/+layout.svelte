<script lang="ts">
import { browser } from '$app/environment';
import { page } from '$app/state';
import { isRtlLocale } from '$lib/client/rtl-detection';
import { syncManager } from '$lib/client/sync-manager';
import { syncSettingsWatcher } from '$lib/client/sync-settings-watcher.svelte';
import {
	categorySettings,
	displaySettings,
	experimentalSettings,
	languageSettings,
	loadAllSettings,
	settings,
	themeSettings,
} from '$lib/data/settings.svelte.js';
import { language } from '$lib/stores/language.svelte.js';
import { pageMetadata } from '$lib/stores/pageMetadata.svelte.js';
import '../styles/index.css';
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import type { PageData } from './$types';
import 'overlayscrollbars/overlayscrollbars.css';
import { onMount, type Snippet, setContext } from 'svelte';
import { deepMerge, MetaTags } from 'svelte-meta-tags';

// Props from layout load
let { data, children }: { data: PageData; children: Snippet } = $props();

// Set session context for child components
setContext('session', data.session);

// Initialize OverlayScrollbars hook (must be at component level, not in onMount)
let scrollbarsInitializer: ((element: HTMLElement) => void) | null = null;
if (browser) {
	const [initialize] = useOverlayScrollbars({
		defer: true,
		options: {
			scrollbars: {
				visibility: 'auto',
			},
		},
	});
	scrollbarsInitializer = initialize;
}

// Merge base meta tags with page-specific ones
// Priority order: pageMetadata store (client-side) > page.data (SSR) > base tags
// page.data contains the data from individual +page.server.ts files
let metaTags = $derived(
	deepMerge(data.baseMetaTags, deepMerge(page.data?.pageMetaTags || {}, pageMetadata || {})),
);

// Determine if the current locale is RTL
// Use UI language for RTL detection since it controls the interface
const isRtl = $derived(isRtlLocale(languageSettings.ui));

// Apply RTL direction to the HTML element
$effect(() => {
	if (browser && typeof document !== 'undefined') {
		document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
		// Also add/remove RTL class for Tailwind CSS utilities
		if (isRtl) {
			document.documentElement.classList.add('rtl');
		} else {
			document.documentElement.classList.remove('rtl');
		}
	}
});

onMount(async () => {
	// Load all settings from localStorage
	const isLoggedIn = !!data.session?.loggedIn;
	loadAllSettings({ isLoggedIn });

	// Initialize language first (loads saved language from localStorage)
	language.init();

	// Initialize language strings
	if (data.strings) {
		language.initStrings(data.strings);
	}

	// Initialize categories
	categorySettings.init();

	// Initialize sync watcher
	if (syncSettingsWatcher) {
		syncSettingsWatcher.initialize();
	}

	// Initialize sync if user is logged in
	if (data.session?.loggedIn) {
		// Initialize sync manager
		await syncManager.initialize(data.session.id);
	}

	// Initialize OverlayScrollbars on the body element
	if (browser && document.body && scrollbarsInitializer) {
		// Add the initialization attribute to prevent flickering
		document.body.setAttribute('data-overlayscrollbars-initialize', '');
		document.documentElement.setAttribute('data-overlayscrollbars-initialize', '');

		// Initialize OverlayScrollbars on the body
		scrollbarsInitializer(document.body);
	}
});

// Watch for language changes (e.g., from sync) and reload locale data
$effect(() => {
	const currentLang = languageSettings.ui;

	// Skip initial run
	if (browser && language.current !== currentLang) {
		console.log('[Layout] Language changed to:', currentLang);
		language.set(currentLang);
	}
});
</script>

<MetaTags {...metaTags} />

{@render children()}
