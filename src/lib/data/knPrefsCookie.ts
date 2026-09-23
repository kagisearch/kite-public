/**
 * Explicit kn_prefs cookie sync. Called from the small set of places that
 * actually mutate user preferences (category-settings setters, language
 * setters, sync-manager post-pull). NOT a reactive $effect — that approach
 * fired on every state change including initial localStorage loads, which
 * raced against sync's settings pulls and could overwrite a fresh cookie
 * with stale local state.
 *
 * The cookie reflects the post-mutation truth: whatever's in
 * categorySettings + languageSettings at the moment of the call. Bails on
 * the server (no document.cookie). Skips redundant writes via lastWritten
 * comparison.
 */
import { browser } from '$app/environment';
import {
	compactContentFilterPrefs,
	type KnContentFilterPrefs,
	type KnExperimentalPrefs,
	type KnPrefs,
	serializeKnPrefs,
	writeKnPrefsCookie,
} from './knPrefs';
import { languageSettings, settings } from './settings.svelte';

let lastWritten = '';

export function syncKnPrefsCookie(): void {
	if (!browser) return;

	// Read the persisted state directly, not categorySettings.enabled (which
	// overlays a temporary UI-only category). Temporary categories must not
	// leak into the cookie or they'd become permanent on next page load.
	const enabled = settings.enabledCategories.currentValue;
	if (enabled.length === 0) return;

	// Project enabled into categoryOrder so cookie's enabled[0] matches the
	// first nav tab the user actually sees. enabledCategories is a CRDT set
	// whose array order isn't meaningful — sync merges and insertion order
	// can shuffle it independently of categoryOrder.
	const enabledSet = new Set(enabled);
	const order = settings.categoryOrder.currentValue;
	const orderedEnabled = order.filter((id) => enabledSet.has(id));
	const missing = enabled.filter((id) => !order.includes(id));

	const prefs: Omit<KnPrefs, 'contentFilter'> & {
		contentFilter?: KnContentFilterPrefs;
		experimental?: KnExperimentalPrefs;
	} = {
		enabled: [...orderedEnabled, ...missing],
		dataLang: languageSettings.getLanguageForAPI(),
		display: {
			fontSize: settings.fontSize.currentValue,
			storyCount: settings.storyCount.currentValue,
			layoutWidth: settings.layoutWidth.currentValue,
			categoryHeaderPosition: settings.categoryHeaderPosition.currentValue,
			introShown: settings.introShown.currentValue,
			singlePageMode: settings.singlePageMode.currentValue,
		},
	};

	const contentFilter = readContentFilterPrefs();
	if (contentFilter) {
		prefs.contentFilter = contentFilter;
	}

	const experimental = readExperimentalPrefs();
	if (experimental) {
		prefs.experimental = experimental;
	}

	const serialized = serializeKnPrefs(prefs);
	if (serialized === lastWritten) return;

	if (writeKnPrefsCookie(prefs)) {
		lastWritten = serialized;
		return;
	}

	// Browsers silently drop cookie writes over ~4096 bytes. The contentFilter
	// section is by far the heaviest field (up to 200 user-defined keywords
	// alongside preset IDs), so try again without it. Losing the SSR-side
	// content-filter prepaint is acceptable degradation; the client-side
	// filter still applies post-hydration via localStorage. Keeping the
	// enabled-categories side of the cookie up to date matters far more.
	if (prefs.contentFilter) {
		const trimmed = { ...prefs };
		delete trimmed.contentFilter;
		if (writeKnPrefsCookie(trimmed)) {
			lastWritten = serializeKnPrefs(trimmed);
			console.warn(
				'[kn_prefs] cookie write hit the size limit; dropped contentFilter to fit',
				{ originalLength: serialized.length },
			);
			return;
		}
	}

	// Still failed — most likely the browser is refusing cookie writes entirely
	// (private mode strict settings, partitioned storage, extension). Surface
	// this loudly so the next page load's staleness is at least explained.
	console.warn(
		'[kn_prefs] cookie write rejected by the browser; SSR will keep rendering stale state',
		{ length: serialized.length },
	);
}

function readContentFilterPrefs(): KnContentFilterPrefs | undefined {
	try {
		const raw = localStorage.getItem('kite-content-filter');
		if (!raw) return undefined;
		const parsed = JSON.parse(raw);
		return compactContentFilterPrefs(parsed, languageSettings.data) ?? undefined;
	} catch {
		return undefined;
	}
}

function readExperimentalPrefs(): KnExperimentalPrefs | undefined {
	try {
		const raw = localStorage.getItem('kite-experimental-features');
		if (!raw) return undefined;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return undefined;
		const prefs: KnExperimentalPrefs = {};
		if (typeof parsed.showChaosIndex === 'boolean') {
			prefs.showChaosIndex = parsed.showChaosIndex;
		}
		return Object.keys(prefs).length > 0 ? prefs : undefined;
	} catch {
		return undefined;
	}
}
