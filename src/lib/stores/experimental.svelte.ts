import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';

export interface ExperimentalFeatures {
	showArticleIcons: boolean;
	showCategoryIcons: boolean;
	disableCategorySwipe: boolean;
	showChaosIndex: boolean;
}

const STORAGE_KEY = 'kite-experimental-features';

const DEFAULT_FEATURES: ExperimentalFeatures = {
	showArticleIcons: false,
	showCategoryIcons: false,
	disableCategorySwipe: false,
	showChaosIndex: false,
};

// Initialize experimental features state
const experimentalState = $state<ExperimentalFeatures>({ ...DEFAULT_FEATURES });

// Helper functions
function getInitialFeatures(): ExperimentalFeatures {
	if (!browser) return DEFAULT_FEATURES;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...DEFAULT_FEATURES, ...parsed };
		}
	} catch (error) {
		console.warn('Failed to read experimental features from localStorage:', error);
	}

	return DEFAULT_FEATURES;
}

function saveFeatures(features: ExperimentalFeatures) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(features));

		// Track changes for sync - save the entire experimental features object
		if (syncManager) {
			syncManager.trackSettingChange('kite-experimental-features', JSON.stringify(features));
		}
	} catch (error) {
		console.warn('Failed to save experimental features to localStorage:', error);
	}
}

function loadFeatures() {
	const initial = getInitialFeatures();
	Object.assign(experimentalState, initial);
}

// Experimental features store API
export const experimental = {
	get showArticleIcons() {
		return experimentalState.showArticleIcons;
	},

	get showCategoryIcons() {
		return experimentalState.showCategoryIcons;
	},

	get disableCategorySwipe() {
		return experimentalState.disableCategorySwipe;
	},

	get showChaosIndex() {
		return experimentalState.showChaosIndex;
	},

	toggleFeature(featureName: keyof ExperimentalFeatures) {
		experimentalState[featureName] = !experimentalState[featureName];
		saveFeatures(experimentalState);
	},

	setFeature(featureName: keyof ExperimentalFeatures, value: boolean) {
		experimentalState[featureName] = value;
		saveFeatures(experimentalState);
	},

	setFeatures(newFeatures: Partial<ExperimentalFeatures>) {
		Object.assign(experimentalState, newFeatures);
		saveFeatures(experimentalState);
	},

	reset() {
		Object.assign(experimentalState, DEFAULT_FEATURES);
		if (browser) {
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch (error) {
				console.warn('Failed to remove experimental features from localStorage:', error);
			}
		}
	},

	init() {
		if (browser) {
			loadFeatures();
		}
	},
};
