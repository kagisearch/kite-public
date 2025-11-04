import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { s } from '$lib/client/localization.svelte';
import { displaySettings, languageSettings, categorySettings } from '$lib/data/settings.svelte';
import { timeTravelNavigationService } from '$lib/services/timeTravelNavigationService';
import { timeTravel } from '$lib/stores/timeTravel.svelte';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import { dataReloadService } from '$lib/services/dataService';
import type { Story, Category, Article, Domain, MediaInfo } from '$lib/types';
import { kiteDB } from '$lib/db/dexie';
import type { HistoryManagerInstance } from '$lib/types/components';

interface PageHelpersOptions {
	lastUpdated: string;
	expandedStories: Record<string, boolean>;
	showSourceOverlay: boolean;
	wikipediaPopupVisible: boolean;
	currentCategory: string;
	orderedCategories: Category[];
	isLatestBatch: boolean;
	isSharedArticleView: boolean;
	sharedArticleIndex: number | null;
	sharedClusterId: number | null;
	currentBatchCreatedAt: string;
	historyManager: HistoryManagerInstance | undefined;
	initiallyExpandedStoryIndex: number | null;
	readStories: Record<string, boolean>;
	totalStoriesRead: number;
}

/**
 * Helper functions for page interactions
 */
interface WikipediaPopupState {
	visible: boolean;
	title: string;
	content: string;
	imageUrl: string;
}

export function usePageHelpers(
	state: PageHelpersOptions,
	actions: {
		setExpandedStories: (value: Record<string, boolean>) => void;
		setInitiallyExpandedStoryIndex: (value: number | null) => void;
		setShowSourceOverlay: (value: boolean) => void;
		setCurrentSource: (value: Domain | null) => void;
		setSourceArticles: (value: Article[]) => void;
		setCurrentMediaInfo: (value: MediaInfo | null) => void;
		setIsLoadingMediaInfo: (value: boolean) => void;
		setWikipediaPopup: (value: WikipediaPopupState) => void;
		setShowSearchModal: (value: boolean) => void;
		setIsSharedArticleView: (value: boolean) => void;
		setSharedArticleIndex: (value: number | null) => void;
		setSharedClusterId: (value: number | null) => void;
		setReadStories: (value: Record<string, boolean>) => void;
		setTotalStoriesRead: (value: number) => void;
		handleCategoryChange: (category: string, updateUrl: boolean) => void;
		handleStoryToggle: (storyId: string, updateUrl: boolean) => void;
	},
) {
	const getLastUpdated = (): string => state.lastUpdated || s('loading.default') || 'Loading...';

	const handleCloseSource = () => {
		actions.setShowSourceOverlay(false);
		actions.setCurrentSource(null);
		actions.setSourceArticles([]);
		actions.setCurrentMediaInfo(null);
		actions.setIsLoadingMediaInfo(false);
	};

	const closeWikipediaPopup = () => {
		actions.setWikipediaPopup({ visible: false, title: '', content: '', imageUrl: '' });
	};

	const handleWikipediaClick = (title: string, content: string, imageUrl?: string) => {
		actions.setWikipediaPopup({
			visible: true,
			title,
			content,
			imageUrl: imageUrl || '',
		});
	};

	const handleIntroClose = () => {
		displaySettings.showIntro = false;
		if (browser && window.location.pathname === '/about') {
			if (state.orderedCategories.length > 0) {
				window.history.pushState({}, '', '/');
			} else {
				window.location.pathname = '/';
			}
		}
	};

	const handleExitSharedView = async () => {
		actions.setIsSharedArticleView(false);
		actions.setSharedArticleIndex(null);
		actions.setSharedClusterId(null);
		actions.setExpandedStories({});
		actions.setInitiallyExpandedStoryIndex(null);

		if (!state.isLatestBatch) {
			timeTravel.reset();
			timeTravelBatch.clear();
			await dataReloadService.reloadData();
		} else {
			if (state.historyManager) {
				state.historyManager.updateUrl({
					storyIndex: null,
					isShared: false,
				});
			}
		}
	};

	const handleLogoClick = () => {
		if (state.isSharedArticleView) {
			handleExitSharedView();
			return;
		}

		if (timeTravel.selectedDate) {
			timeTravel.reset();
			timeTravelBatch.clear();
			dataReloadService.reloadData();
		}

		actions.setExpandedStories({});
		actions.setInitiallyExpandedStoryIndex(null);

		const firstCategory = state.orderedCategories[0];
		if (firstCategory && firstCategory.id !== state.currentCategory) {
			actions.handleCategoryChange(firstCategory.id, true);
		}

		if (browser) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const handleSearchSelectStory = async (
		categoryId: string,
		story: Story,
		batchId?: string,
		batchDate?: string,
	) => {
		if (batchId) {
			try {
				const latestResponse = await fetch(`/api/batches/latest?lang=${languageSettings.data}`);
				const latestData = await latestResponse.json();
				const isSelectedBatchLatest = latestData.id && latestData.id === batchId;

				const storyIndex = story.cluster_number ? story.cluster_number - 1 : 0;

				if (!isSelectedBatchLatest) {
					await timeTravelNavigationService.enterTimeTravel({
						batchId,
						batchDate,
						categoryId,
						storyIndex,
						reload: true,
						navigate: false,
					});

					actions.setShowSearchModal(false);

					if (categoryId !== state.currentCategory) {
						actions.handleCategoryChange(categoryId, true);
					}

					const storyId = story.cluster_number?.toString() || story.title;
					actions.handleStoryToggle(storyId, true);

					setTimeout(() => {
						const storyElement = document.querySelector(`[data-story-id="${storyId}"]`);
						if (storyElement) {
							storyElement.scrollIntoView({
								behavior: displaySettings.storyOpenMode === 'single' ? 'instant' : 'smooth',
								block: 'center',
							});
						}
					}, 100);
				} else {
					let targetUrl = '/';
					if (displaySettings.useLatestUrls) {
						targetUrl = `/latest/${categoryId}/${storyIndex}`;
					} else {
						targetUrl = `/${batchId}/${categoryId}/${storyIndex}`;
					}
					await goto(targetUrl);
				}

				return;
			} catch (error) {
				console.error('Error handling batch selection from search:', error);
			}
		}

		if (categoryId !== state.currentCategory) {
			actions.handleCategoryChange(categoryId, true);
		}

		setTimeout(() => {
			const storyId = story.cluster_number?.toString() || story.title;
			actions.handleStoryToggle(storyId, true);

			const storyElement = document.querySelector(`[data-story-id="${storyId}"]`);
			if (storyElement) {
				storyElement.scrollIntoView({
					behavior: displaySettings.storyOpenMode === 'single' ? 'instant' : 'smooth',
					block: 'center',
				});
			}
		}, 100);
	};

	const reloadReadStories = async () => {
		try {
			const storyIds = await kiteDB.getReadStoryIds();
			const newReadStories: Record<string, boolean> = {};
			storyIds.forEach((id) => {
				newReadStories[id] = true;
			});
			actions.setReadStories(newReadStories);
			actions.setTotalStoriesRead(storyIds.size);
		} catch (error) {
			console.error('[UI] Error loading saved stories:', error);
			actions.setReadStories({});
			actions.setTotalStoriesRead(0);
		}
	};

	return {
		getLastUpdated,
		handleCloseSource,
		closeWikipediaPopup,
		handleWikipediaClick,
		handleIntroClose,
		handleExitSharedView,
		handleLogoClick,
		handleSearchSelectStory,
		reloadReadStories,
	};
}
