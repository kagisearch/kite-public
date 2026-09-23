import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';

const STORAGE_KEY = 'kite-sources-expanded';

// Default collapsed: long-tail stories (30-70+ domains) are too noisy when
// expanded by default. Power users can flip this once and persist via
// localStorage + cross-device sync.
const state = $state({ expanded: false });

if (browser) {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored !== null) state.expanded = stored === 'true';
	} catch (error) {
		console.warn('Failed to read sources expand pref from localStorage:', error);
	}
}

function persist(value: boolean) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, String(value));
		if (syncManager) {
			syncManager.trackSettingChange(STORAGE_KEY, String(value));
		}
	} catch (error) {
		console.warn('Failed to save sources expand pref to localStorage:', error);
	}
}

export const sourcesPrefs = {
	get expanded() {
		return state.expanded;
	},
	setExpanded(value: boolean) {
		state.expanded = value;
		persist(value);
	},
	toggle() {
		this.setExpanded(!state.expanded);
	},
};
