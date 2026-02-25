import { browser } from '$app/environment';
import type { Article, Category, Domain, MediaInfo, OnThisDayEvent, Story } from '$lib/types';
import type {
	CategoryNavigationInstance,
	HistoryManagerInstance,
	StoryListInstance,
} from '$lib/types/components';

/**
 * Manages all page-level state for the main app
 */
export function usePageState() {
	// App state
	let dataLoaded = $state(browser && window.location.pathname === '/about');
	let offlineMode = $state(false);
	let lastLoadedCategory = $state('');
	let temporaryCategory = $state<string | null>(null);
	let showTemporaryCategoryTooltip = $state(false);
	let temporaryCategoryElement = $state<HTMLElement | null>(null);
	let desktopCategoryNavigation = $state<CategoryNavigationInstance | undefined>();
	let storyCountOverride = $state<number | null>(null);
	let showOnboarding = $state(false);
	let showSearchModal = $state(false);
	let isSharedArticleView = $state(false);
	let sharedArticleIndex = $state<number | null>(null);
	let sharedClusterId = $state<number | null>(null);
	let showAboutPage = $state(browser && window.location.pathname === '/about');

	// Data state
	let categories = $state<Category[]>([]);
	let currentCategory = $state('World');
	let stories = $state<Story[]>([]);
	let onThisDayEvents = $state<OnThisDayEvent[]>([]);
	let onThisDayLanguage = $state<string>('en');
	let readStories = $state<Record<string, boolean>>({});
	let totalReadCount = $state(0);
	let totalStoriesRead = $state(0);
	let lastUpdated = $state('');
	let lastUpdatedTimestamp = $state(0);
	let allCategoryStories = $state<Record<string, Story[]>>({});
	let categoryMap = $state<Record<string, string>>({});
	let currentBatchId = $state<string>('');
	let currentDateSlug = $state<string | undefined>(undefined);
	let currentBatchCreatedAt = $state<string>('');

	// Component references
	let storyList = $state<StoryListInstance | undefined>();

	// UI overlay state
	let showSourceOverlay = $state(false);
	let currentSource = $state<Domain | null>(null);
	let sourceArticles = $state<Article[]>([]);
	let currentMediaInfo = $state<MediaInfo | null>(null);
	let isLoadingMediaInfo = $state(false);

	// Chaos index
	let chaosIndex = $state({
		score: 0,
		summary: '',
		lastUpdated: '',
	});
	let chaosModalOpen = $state(false);

	// Loading state
	let isLoadingCategory = $state(false);

	// Wikipedia popup
	let wikipediaPopup = $state({
		visible: false,
		title: '',
		content: '',
		imageUrl: '',
	});

	// Story URL management
	let expandedStories = $state<Record<string, boolean>>({});
	let isLatestBatch = $state(true);
	let historyManager = $state<HistoryManagerInstance | undefined>();
	let initiallyExpandedStoryIndex = $state<number | null>(null);

	return {
		// App state
		get dataLoaded() {
			return dataLoaded;
		},
		set dataLoaded(value) {
			dataLoaded = value;
		},
		get offlineMode() {
			return offlineMode;
		},
		set offlineMode(value) {
			offlineMode = value;
		},
		get lastLoadedCategory() {
			return lastLoadedCategory;
		},
		set lastLoadedCategory(value) {
			lastLoadedCategory = value;
		},
		get temporaryCategory() {
			return temporaryCategory;
		},
		set temporaryCategory(value) {
			temporaryCategory = value;
		},
		get showTemporaryCategoryTooltip() {
			return showTemporaryCategoryTooltip;
		},
		set showTemporaryCategoryTooltip(value) {
			showTemporaryCategoryTooltip = value;
		},
		get temporaryCategoryElement() {
			return temporaryCategoryElement;
		},
		set temporaryCategoryElement(value) {
			temporaryCategoryElement = value;
		},
		get desktopCategoryNavigation() {
			return desktopCategoryNavigation;
		},
		set desktopCategoryNavigation(value) {
			desktopCategoryNavigation = value;
		},
		get storyCountOverride() {
			return storyCountOverride;
		},
		set storyCountOverride(value) {
			storyCountOverride = value;
		},
		get showOnboarding() {
			return showOnboarding;
		},
		set showOnboarding(value) {
			showOnboarding = value;
		},
		get showSearchModal() {
			return showSearchModal;
		},
		set showSearchModal(value) {
			showSearchModal = value;
		},
		get isSharedArticleView() {
			return isSharedArticleView;
		},
		set isSharedArticleView(value) {
			isSharedArticleView = value;
		},
		get sharedArticleIndex() {
			return sharedArticleIndex;
		},
		set sharedArticleIndex(value) {
			sharedArticleIndex = value;
		},
		get sharedClusterId() {
			return sharedClusterId;
		},
		set sharedClusterId(value) {
			sharedClusterId = value;
		},
		get showAboutPage() {
			return showAboutPage;
		},
		set showAboutPage(value) {
			showAboutPage = value;
		},

		// Data state
		get categories() {
			return categories;
		},
		set categories(value) {
			categories = value;
		},
		get currentCategory() {
			return currentCategory;
		},
		set currentCategory(value) {
			currentCategory = value;
		},
		get stories() {
			return stories;
		},
		set stories(value) {
			stories = value;
		},
		get onThisDayEvents() {
			return onThisDayEvents;
		},
		set onThisDayEvents(value) {
			onThisDayEvents = value;
		},
		get onThisDayLanguage() {
			return onThisDayLanguage;
		},
		set onThisDayLanguage(value) {
			onThisDayLanguage = value;
		},
		get readStories() {
			return readStories;
		},
		set readStories(value) {
			readStories = value;
		},
		get totalReadCount() {
			return totalReadCount;
		},
		set totalReadCount(value) {
			totalReadCount = value;
		},
		get totalStoriesRead() {
			return totalStoriesRead;
		},
		set totalStoriesRead(value) {
			totalStoriesRead = value;
		},
		get lastUpdated() {
			return lastUpdated;
		},
		set lastUpdated(value) {
			lastUpdated = value;
		},
		get lastUpdatedTimestamp() {
			return lastUpdatedTimestamp;
		},
		set lastUpdatedTimestamp(value) {
			lastUpdatedTimestamp = value;
		},
		get allCategoryStories() {
			return allCategoryStories;
		},
		set allCategoryStories(value) {
			allCategoryStories = value;
		},
		get categoryMap() {
			return categoryMap;
		},
		set categoryMap(value) {
			categoryMap = value;
		},
		get currentBatchId() {
			return currentBatchId;
		},
		set currentBatchId(value) {
			currentBatchId = value;
		},
		get currentDateSlug() {
			return currentDateSlug;
		},
		set currentDateSlug(value) {
			currentDateSlug = value;
		},
		get currentBatchCreatedAt() {
			return currentBatchCreatedAt;
		},
		set currentBatchCreatedAt(value) {
			currentBatchCreatedAt = value;
		},

		// Component refs
		get storyList() {
			return storyList;
		},
		set storyList(value) {
			storyList = value;
		},

		// UI overlays
		get showSourceOverlay() {
			return showSourceOverlay;
		},
		set showSourceOverlay(value) {
			showSourceOverlay = value;
		},
		get currentSource() {
			return currentSource;
		},
		set currentSource(value) {
			currentSource = value;
		},
		get sourceArticles() {
			return sourceArticles;
		},
		set sourceArticles(value) {
			sourceArticles = value;
		},
		get currentMediaInfo() {
			return currentMediaInfo;
		},
		set currentMediaInfo(value) {
			currentMediaInfo = value;
		},
		get isLoadingMediaInfo() {
			return isLoadingMediaInfo;
		},
		set isLoadingMediaInfo(value) {
			isLoadingMediaInfo = value;
		},

		// Chaos
		get chaosIndex() {
			return chaosIndex;
		},
		set chaosIndex(value) {
			chaosIndex = value;
		},
		get chaosModalOpen() {
			return chaosModalOpen;
		},
		set chaosModalOpen(value) {
			chaosModalOpen = value;
		},

		// Loading
		get isLoadingCategory() {
			return isLoadingCategory;
		},
		set isLoadingCategory(value) {
			isLoadingCategory = value;
		},

		// Wikipedia
		get wikipediaPopup() {
			return wikipediaPopup;
		},
		set wikipediaPopup(value) {
			wikipediaPopup = value;
		},

		// Story management
		get expandedStories() {
			return expandedStories;
		},
		set expandedStories(value) {
			expandedStories = value;
		},
		get isLatestBatch() {
			return isLatestBatch;
		},
		set isLatestBatch(value) {
			isLatestBatch = value;
		},
		get historyManager() {
			return historyManager;
		},
		set historyManager(value) {
			historyManager = value;
		},
		get initiallyExpandedStoryIndex() {
			return initiallyExpandedStoryIndex;
		},
		set initiallyExpandedStoryIndex(value) {
			initiallyExpandedStoryIndex = value;
		},
	};
}
