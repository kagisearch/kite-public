import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';
import communityFilters from '$lib/data/contentFilters.json';
import type { FilterMode, FilterScope } from '$lib/data/settings.svelte';

interface FilterPreset {
	id: string;
	label: string;
	keywords: string[] | Record<string, string[]>;
}

class ContentFilterStore {
	// Make each property individually reactive with $state
	keywords = $state<string[]>([]);
	activePresets = $state<string[]>([]);
	filterMode = $state<FilterMode>('hide');
	filterScope = $state<FilterScope>('all');
	showFilteredCount = $state<boolean>(true);

	private readonly STORAGE_KEY = 'kite-content-filter';
	private readonly CONFIG_VERSION = 1; // Increment when breaking changes occur
	private currentLanguage: string | undefined;

	// Load community-maintained filter presets from JSON
	readonly presets: FilterPreset[] = communityFilters.filters;

	constructor() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	// Method to reinitialize from localStorage (used after sync)
	init() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	private loadFromStorage() {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (parsed.keywords) this.keywords = parsed.keywords;
				if (parsed.activePresets) this.activePresets = parsed.activePresets;
				if (parsed.filterMode) this.filterMode = parsed.filterMode;
				if (parsed.filterScope) this.filterScope = parsed.filterScope;
				if (parsed.showFilteredCount !== undefined)
					this.showFilteredCount = parsed.showFilteredCount;
			}
		} catch (error) {
			console.error('Failed to load content filter settings:', error);
		}
	}

	private saveToStorage() {
		if (!browser) return;
		try {
			const config = {
				keywords: this.keywords,
				activePresets: this.activePresets,
				filterMode: this.filterMode,
				filterScope: this.filterScope,
				showFilteredCount: this.showFilteredCount,
				version: this.CONFIG_VERSION,
			};
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));

			// Track changes for sync - sync the entire config as one setting
			if (syncManager) {
				syncManager.trackSettingChange(this.STORAGE_KEY, JSON.stringify(config));
			}
		} catch (error) {
			console.error('Failed to save content filter settings:', error);
		}
	}

	get allSettings() {
		return {
			keywords: this.keywords,
			activePresets: this.activePresets,
			filterMode: this.filterMode,
			filterScope: this.filterScope,
			showFilteredCount: this.showFilteredCount,
		};
	}

	get isActive() {
		return this.keywords.length > 0 || this.activePresets.length > 0;
	}

	setFilterMode(mode: FilterMode) {
		this.filterMode = mode;
		this.saveToStorage();
	}

	setFilterScope(scope: FilterScope) {
		this.filterScope = scope;
		this.saveToStorage();
	}

	setShowFilteredCount(show: boolean) {
		this.showFilteredCount = show;
		this.saveToStorage();
	}

	addKeyword(keyword: string) {
		const normalized = keyword.toLowerCase().trim();
		if (normalized && !this.keywords.includes(normalized)) {
			this.keywords = [...this.keywords, normalized];
			this.saveToStorage();
		}
	}

	addKeywords(keywords: string[]) {
		const normalized = keywords
			.map((k) => k.toLowerCase().trim())
			.filter((k) => k && !this.keywords.includes(k));

		if (normalized.length > 0) {
			this.keywords = [...this.keywords, ...normalized];
			this.saveToStorage();
		}
	}

	removeKeyword(keyword: string) {
		this.keywords = this.keywords.filter((k: string) => k !== keyword.toLowerCase());
		this.saveToStorage();
	}

	clearKeywords() {
		// Reassign arrays to trigger Svelte 5 reactivity
		this.keywords = [];
		this.activePresets = [];
		this.saveToStorage();
	}

	togglePreset(presetId: string, language: string = 'default') {
		const preset = this.presets.find((p) => p.id === presetId);
		if (!preset) return;

		// Get keywords for the current language
		const keywords = this.getPresetKeywords(preset, language);

		if (this.activePresets.includes(presetId)) {
			// Remove preset
			this.activePresets = this.activePresets.filter((id: string) => id !== presetId);
			// Remove preset keywords from keywords list
			this.keywords = this.keywords.filter((k: string) => !keywords.includes(k));
		} else {
			// Add preset
			this.activePresets = [...this.activePresets, presetId];
			// Add preset keywords to keywords list (avoid duplicates)
			const newKeywords = keywords.filter((k) => !this.keywords.includes(k));
			this.keywords = [...this.keywords, ...newKeywords];
		}
		this.saveToStorage();
	}

	private getPresetKeywords(preset: FilterPreset, language: string): string[] {
		if (Array.isArray(preset.keywords)) {
			// Legacy format - return as is
			return preset.keywords;
		}

		// New multilingual format
		const keywords =
			preset.keywords[language] || preset.keywords.default || preset.keywords.en || [];
		return keywords;
	}

	isPresetActive(presetId: string): boolean {
		return this.activePresets.includes(presetId);
	}

	addCustomKeyword(keyword: string) {
		this.addKeyword(keyword);
	}

	reset() {
		// Reset all reactive properties individually
		this.keywords = [];
		this.activePresets = [];
		this.filterMode = 'hide';
		this.filterScope = 'all';
		this.showFilteredCount = true;
		this.saveToStorage();
	}

	hasKeyword(keyword: string): boolean {
		return this.keywords.includes(keyword.toLowerCase());
	}

	// Update keywords when language changes
	updateLanguage(newLanguage: string) {
		// Skip if no active presets
		if (this.activePresets.length === 0) return;

		// Skip if language hasn't changed (for stores that might not track this)
		if (this.currentLanguage === newLanguage) return;
		this.currentLanguage = newLanguage;

		// Save custom keywords (those not from any preset in any language)
		const customKeywords: string[] = [];
		this.keywords.forEach((keyword: string) => {
			let isFromPreset = false;
			for (const preset of this.presets) {
				if (Array.isArray(preset.keywords)) {
					if (preset.keywords.includes(keyword)) {
						isFromPreset = true;
						break;
					}
				} else {
					// Check all language variants
					for (const lang in preset.keywords) {
						if (preset.keywords[lang].includes(keyword)) {
							isFromPreset = true;
							break;
						}
					}
					if (isFromPreset) break;
				}
			}
			if (!isFromPreset) {
				customKeywords.push(keyword);
			}
		});

		// Clear all keywords
		this.keywords = [];

		// Re-apply all active presets with the new language
		this.activePresets.forEach((presetId: string) => {
			const preset = this.presets.find((p) => p.id === presetId);
			if (preset) {
				const keywords = this.getPresetKeywords(preset, newLanguage);
				const newKeywords = keywords.filter((k) => !this.keywords.includes(k));
				this.keywords = [...this.keywords, ...newKeywords];
			}
		});

		// Re-add custom keywords
		customKeywords.forEach((keyword) => {
			if (!this.keywords.includes(keyword)) {
				this.keywords.push(keyword);
			}
		});

		this.saveToStorage();
	}

	// Export current configuration
	exportConfig(): string {
		const config = {
			_comment: 'Kite News Content Filter Settings - https://kite.kagi.com',
			_description:
				'This file contains your personal content filter preferences for Kite News. You can import this file later to restore your settings.',
			keywords: this.keywords,
			activePresets: this.activePresets,
			filterMode: this.filterMode,
			filterScope: this.filterScope,
			showFilteredCount: this.showFilteredCount,
			version: this.CONFIG_VERSION,
			exportDate: new Date().toISOString(),
		};
		return JSON.stringify(config, null, 2);
	}

	// Import configuration with validation (returns translation keys)
	importConfig(jsonString: string): {
		success: boolean;
		warningKey?: string;
		errorKey?: string;
	} {
		try {
			const config = JSON.parse(jsonString);

			// Validate structure
			if (!config || typeof config !== 'object') {
				return {
					success: false,
					errorKey: 'settings.contentFilter.importError.invalidFormat',
				};
			}

			// Check version compatibility
			let warningKey: string | undefined;
			if (config.version !== this.CONFIG_VERSION) {
				if (config.version > this.CONFIG_VERSION) {
					warningKey = 'settings.contentFilter.importConfirm.versionNewer';
				} else {
					warningKey = 'settings.contentFilter.importConfirm.versionOlder';
				}
			}

			// Import settings
			if (Array.isArray(config.keywords)) {
				this.keywords = config.keywords;
			}
			if (Array.isArray(config.activePresets)) {
				this.activePresets = config.activePresets;
			}
			if (config.filterMode === 'hide' || config.filterMode === 'blur') {
				this.filterMode = config.filterMode;
			}
			if (
				config.filterScope === 'title' ||
				config.filterScope === 'summary' ||
				config.filterScope === 'all'
			) {
				this.filterScope = config.filterScope;
			}
			if (typeof config.showFilteredCount === 'boolean') {
				this.showFilteredCount = config.showFilteredCount;
			}

			this.saveToStorage();
			return { success: true, warningKey };
		} catch (_error) {
			return {
				success: false,
				errorKey: 'settings.contentFilter.importError.parseFailed',
			};
		}
	}
}

export const contentFilter = new ContentFilterStore();
