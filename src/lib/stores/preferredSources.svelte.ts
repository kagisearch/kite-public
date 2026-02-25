import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';

const STORAGE_KEY = 'kite-preferred-sources';

// Reactive state for preferred sources (array of domain names)
const preferredSourcesState = $state<string[]>([]);

function loadFromStorage(): string[] {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.warn('[PreferredSources] Failed to load from storage:', error);
		return [];
	}
}

function saveToStorage(sources: string[]) {
	if (!browser) return;
	try {
		const json = JSON.stringify(sources);
		localStorage.setItem(STORAGE_KEY, json);

		// Track for sync (following contentFilter pattern)
		if (syncManager) {
			syncManager.trackSettingChange(STORAGE_KEY, json);
		}
	} catch (error) {
		console.warn('[PreferredSources] Failed to save to storage:', error);
	}
}

// Initialize on load
if (browser) {
	const loaded = loadFromStorage();
	preferredSourcesState.splice(0, preferredSourcesState.length, ...loaded);
}

export const preferredSources = {
	/**
	 * Get the list of preferred source domains
	 */
	get list(): string[] {
		return preferredSourcesState;
	},

	/**
	 * Check if a domain is preferred
	 */
	isPreferred(domain: string | undefined): boolean {
		if (!domain) return false;
		return preferredSourcesState.includes(domain);
	},

	/**
	 * Toggle preferred status for a domain
	 */
	togglePreferred(domain: string) {
		const index = preferredSourcesState.indexOf(domain);
		if (index === -1) {
			preferredSourcesState.push(domain);
		} else {
			preferredSourcesState.splice(index, 1);
		}
		saveToStorage([...preferredSourcesState]);
	},

	/**
	 * Add a domain to preferred sources
	 */
	addPreferred(domain: string) {
		if (!preferredSourcesState.includes(domain)) {
			preferredSourcesState.push(domain);
			saveToStorage([...preferredSourcesState]);
		}
	},

	/**
	 * Remove a domain from preferred sources
	 */
	removePreferred(domain: string) {
		const index = preferredSourcesState.indexOf(domain);
		if (index !== -1) {
			preferredSourcesState.splice(index, 1);
			saveToStorage([...preferredSourcesState]);
		}
	},

	/**
	 * Clear all preferred sources
	 */
	clear() {
		preferredSourcesState.splice(0, preferredSourcesState.length);
		saveToStorage([]);
	},

	/**
	 * Reinitialize from localStorage (used after sync)
	 */
	init() {
		if (browser) {
			const loaded = loadFromStorage();
			preferredSourcesState.splice(0, preferredSourcesState.length, ...loaded);
		}
	},
};
