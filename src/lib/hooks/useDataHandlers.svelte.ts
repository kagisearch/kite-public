import { browser } from '$app/environment';
import { displaySettings, languageSettings } from '$lib/data/settings.svelte';
import { dataService } from '$lib/services/dataService';
import type { NavigationParams } from '$lib/services/urlNavigationService';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import type { Category, OnThisDayEvent, Story } from '$lib/types';
import type { HistoryManagerInstance } from '$lib/types/components';
import { formatTimeAgo } from '$lib/utils/formatTimeAgo';

interface DataLoadResult {
	categories: Category[];
	stories: Story[];
	totalReadCount: number;
	lastUpdated: string;
	lastUpdatedTimestamp: number;
	currentCategory: string;
	allCategoryStories: Record<string, Story[]>;
	categoryMap: Record<string, string>;
	batchId: string;
	dateSlug?: string;
	batchCreatedAt?: string;
	chaosIndex?: number;
	chaosDescription?: string;
	chaosLastUpdated?: string;
	isLatestBatch: boolean;
	temporaryCategory?: string | null;
}

interface DataHandlersState {
	categories: Category[];
	stories: Story[];
	totalReadCount: number;
	lastUpdated: string;
	lastUpdatedTimestamp: number;
	currentCategory: string;
	allCategoryStories: Record<string, Story[]>;
	categoryMap: Record<string, string>;
	currentBatchId: string;
	currentDateSlug: string | undefined;
	currentBatchCreatedAt: string;
	lastLoadedCategory: string;
	isLatestBatch: boolean;
	chaosIndex: { score: number; summary: string; lastUpdated: string };
	temporaryCategory: string | null;
	showTemporaryCategoryTooltip: boolean;
	dataLoaded: boolean;
	isLoadingCategory: boolean;
	onThisDayEvents: OnThisDayEvent[];
	onThisDayLanguage: string;
	expandedStories: Record<string, boolean>;
	initiallyExpandedStoryIndex: number | null;
	storyCountOverride: number | null;
}

/**
 * Handles data loading and API interactions
 */
export function useDataHandlers(
	state: DataHandlersState,
	helpers: {
		updatePageTitle: (categoryId: string) => void;
		closeSourceOverlay: () => void;
		closeWikipediaPopup: () => void;
		historyManager: HistoryManagerInstance | undefined;
		parseInitialUrl: () => NavigationParams;
		s: (key: string) => string;
	},
) {
	function handleDataLoaded(data: DataLoadResult) {
		// Clear loading state
		state.isLoadingCategory = false;

		// Reset app state for fresh data
		state.expandedStories = {};
		state.lastLoadedCategory = '';
		state.onThisDayEvents = [];

		// Close any open overlays
		helpers.closeSourceOverlay();
		helpers.closeWikipediaPopup();

		// Load new data
		state.categories = data.categories;
		state.stories = data.stories;
		state.totalReadCount = data.totalReadCount;
		state.lastUpdated = data.lastUpdated;
		state.lastUpdatedTimestamp = data.lastUpdatedTimestamp;
		state.currentCategory = data.currentCategory;
		state.allCategoryStories = data.allCategoryStories;
		state.categoryMap = data.categoryMap;
		state.currentBatchId = data.batchId;
		state.currentDateSlug = data.dateSlug;
		state.currentBatchCreatedAt = data.batchCreatedAt || '';
		state.lastLoadedCategory = data.currentCategory;

		state.isLatestBatch = data.isLatestBatch;
		timeTravelBatch.set(
			state.currentBatchId,
			state.currentBatchCreatedAt || null,
			state.currentDateSlug || null,
			!state.isLatestBatch,
		);

		helpers.updatePageTitle(state.currentCategory);

		// Set chaos index
		if (data.chaosIndex !== undefined && data.chaosDescription && data.chaosLastUpdated) {
			state.chaosIndex = {
				score: data.chaosIndex,
				summary: data.chaosDescription,
				lastUpdated: data.chaosLastUpdated,
			};
		}

		// Handle temporary category
		if (data.temporaryCategory) {
			state.temporaryCategory = data.temporaryCategory;
			state.showTemporaryCategoryTooltip = true;
		}

		state.dataLoaded = true;

		// Defensive: ensure isLoadingCategory is false after all state updates
		// This guards against any effects that might run before seeing the updated allCategoryStories
		state.isLoadingCategory = false;

		// Update URL
		if (helpers.historyManager) {
			helpers.historyManager.updateUrl();
		}

		console.log(
			`🚀 Loaded ${Object.keys(state.allCategoryStories).length} categories with ${Object.values(state.allCategoryStories).flat().length} total stories`,
		);

		// If the current category is OnThisDay, load its events now.
		// OnThisDay is excluded from batch story loading, so lastLoadedCategory being set
		// to 'onthisday' above prevents the reactive effect from triggering the load.
		if (data.currentCategory === 'onthisday') {
			loadOnThisDayEvents();
		}

		// Handle story expansion from URL
		if (browser) {
			const urlParams = helpers.parseInitialUrl();
			if (
				urlParams.storyIndex !== undefined &&
				urlParams.storyIndex !== null &&
				state.stories[urlParams.storyIndex]
			) {
				state.initiallyExpandedStoryIndex = urlParams.storyIndex;

				const story = state.stories[urlParams.storyIndex];
				const storyId = story.cluster_number?.toString() || story.title;
				state.expandedStories[storyId] = true;

				if (urlParams.storyIndex >= displaySettings.storyCount) {
					state.storyCountOverride = urlParams.storyIndex + 1;
				}
			}
		}
	}

	function handleDataError(error: string) {
		console.error('Data loading error:', error);
		state.dataLoaded = true;
	}

	async function loadStoriesForCategory(categoryId: string) {
		// Handle OnThisDay separately
		if (categoryId === 'onthisday') {
			state.isLoadingCategory = true;
			await loadOnThisDayEvents();
			state.isLoadingCategory = false;
			return;
		}

		// Check if we already have preloaded stories
		if (state.allCategoryStories[categoryId]) {
			console.log(`⚡ Using preloaded stories for category: ${categoryId}`);
			state.stories = state.allCategoryStories[categoryId];
			state.lastLoadedCategory = categoryId;
			return;
		}

		// Prevent duplicate loads
		if (state.lastLoadedCategory === categoryId) {
			return;
		}

		state.isLoadingCategory = true;

		const categoryUuid = state.categoryMap[categoryId];
		if (!categoryUuid) {
			console.warn(`Category UUID not found for ${categoryId}`);
			state.stories = [];
			state.lastLoadedCategory = categoryId;
			state.isLoadingCategory = false;
			return;
		}

		try {
			console.log(`📡 Loading stories from API for category: ${categoryId}`);
			state.lastLoadedCategory = categoryId;
			const result = await dataService.loadStories(
				state.currentBatchId,
				categoryUuid,
				12,
				languageSettings.getLanguageForAPI(),
			);
			state.stories = result.stories;
			state.totalReadCount = result.readCount;
			state.lastUpdated = formatTimeAgo(result.timestamp, helpers.s);

			state.allCategoryStories[categoryId] = state.stories;
			console.log(`💾 Cached stories for category: ${categoryId}`);
			state.isLoadingCategory = false;
		} catch (error) {
			console.error('Error loading stories for category:', categoryId, error);
			state.isLoadingCategory = false;
		}
	}

	async function loadOnThisDayEvents() {
		try {
			state.lastLoadedCategory = 'onthisday';
			const result = await dataService.loadOnThisDayEvents(languageSettings.getLanguageForAPI());
			state.onThisDayEvents = result.events;
			state.onThisDayLanguage = result.language;
		} catch (error) {
			console.error('Error loading OnThisDay events:', error);
		}
	}

	return {
		handleDataLoaded,
		handleDataError,
		loadStoriesForCategory,
		loadOnThisDayEvents,
	};
}
