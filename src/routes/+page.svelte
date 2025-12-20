<script lang="ts">
import { IconLoader2 } from '@tabler/icons-svelte';
import { browser } from '$app/environment';
import { page } from '$app/state';
import { s } from '$lib/client/localization.svelte';
import BackToTop from '$lib/components/BackToTop.svelte';
import CategoryNavigation from '$lib/components/CategoryNavigation.svelte';
import DataLoader from '$lib/components/DataLoader.svelte';
import Footer from '$lib/components/Footer.svelte';
import Header from '$lib/components/Header.svelte';
import HistoryManager from '$lib/components/HistoryManager.svelte';
import IntroScreen from '$lib/components/IntroScreen.svelte';
import KeyboardNavigationHandler from '$lib/components/KeyboardNavigationHandler.svelte';
import KeyboardShortcutsHelp from '$lib/components/KeyboardShortcutsHelp.svelte';
import OnThisDay from '$lib/components/OnThisDay.svelte';
import Settings from '$lib/components/Settings.svelte';
import SourceOverlay from '$lib/components/SourceOverlay.svelte';
import StoryList from '$lib/components/StoryList.svelte';
import NHLScores from '$lib/components/nhl/NHLScores.svelte';
import NHLStandings from '$lib/components/nhl/NHLStandings.svelte';
import NFLScores from '$lib/components/nfl/NFLScores.svelte';
import NFLStandings from '$lib/components/nfl/NFLStandings.svelte';
import CryptoPrice from '$lib/components/crypto/CryptoPrice.svelte';
import CryptoGrid from '$lib/components/crypto/CryptoGrid.svelte';
import F1Standings from '$lib/components/f1/F1Standings.svelte';
import F1Schedule from '$lib/components/f1/F1Schedule.svelte';
import Weather from '$lib/components/weather/Weather.svelte';
import { SearchModal } from '$lib/components/search';
import TemporaryCategoryTooltip from '$lib/components/TemporaryCategoryTooltip.svelte';
import TimeTravel from '$lib/components/TimeTravel.svelte';
import Toast from '$lib/components/Toast.svelte';
import WikipediaPopup from '$lib/components/WikipediaPopup.svelte';
import { displaySettings, languageSettings, settingsModalState, type SupportedLanguage, settings } from '$lib/data/settings.svelte.js';
import { navigationHandlerService } from '$lib/services/navigationHandlerService';
import { type NavigationParams, UrlNavigationService } from '$lib/services/urlNavigationService';
import { categorySwipeHandler } from '$lib/utils/categorySwipeHandler';
import { clearImageCache, extractStoryImages, getImageCacheStats } from '$lib/utils/imagePreloader';
import { imagePreloadingService } from '$lib/services/imagePreloadingService';

// Helper function for layout width class
function getContainerWidthClass(): string {
	switch (displaySettings.layoutWidth) {
		case 'wide':
			return 'max-w-4xl';
		case 'full':
			return 'max-w-full';
		default:
			return 'max-w-[732px]';
	}
}

// Composables
import { usePageState } from '$lib/hooks/usePageState.svelte';
import { usePageDerived } from '$lib/hooks/usePageDerived.svelte';
import { usePageSetup } from '$lib/hooks/usePageSetup.svelte';
import { useDataHandlers } from '$lib/hooks/useDataHandlers.svelte';
import { useCategoryManager } from '$lib/hooks/useCategoryManager.svelte';
import { useStoryToggle } from '$lib/hooks/useStoryToggle.svelte';
import { usePageHelpers } from '$lib/hooks/usePageHelpers.svelte';
import { usePageEffects } from '$lib/hooks/usePageEffects.svelte';
import { useSinglePageMode } from '$lib/hooks/useSinglePageMode.svelte';

// Initialize state
const state = usePageState();

// Derived state
const derived = usePageDerived(() => ({
	categories: state.categories,
	temporaryCategory: state.temporaryCategory,
	stories: state.stories,
	expandedStories: state.expandedStories,
	allCategoryStories: state.allCategoryStories,
	storyCountOverride: state.storyCountOverride,
}));

// Helper functions
const parseInitialUrl = (): NavigationParams => {
	if (!browser) return {};
	return UrlNavigationService.parseUrl(page.url);
};

// Helpers composable
const helpers = usePageHelpers(
	{
		get lastUpdated() { return state.lastUpdated; },
		get expandedStories() { return state.expandedStories; },
		get showSourceOverlay() { return state.showSourceOverlay; },
		get wikipediaPopupVisible() { return state.wikipediaPopup.visible; },
		get currentCategory() { return state.currentCategory; },
		get orderedCategories() { return derived.orderedCategories; },
		get isLatestBatch() { return state.isLatestBatch; },
		get isSharedArticleView() { return state.isSharedArticleView; },
		get sharedArticleIndex() { return state.sharedArticleIndex; },
		get sharedClusterId() { return state.sharedClusterId; },
		get currentBatchCreatedAt() { return state.currentBatchCreatedAt; },
		get historyManager() { return state.historyManager; },
		get initiallyExpandedStoryIndex() { return state.initiallyExpandedStoryIndex; },
		get readStories() { return state.readStories; },
		get totalStoriesRead() { return state.totalStoriesRead; },
	},
	{
		setExpandedStories: (v) => { state.expandedStories = v; },
		setInitiallyExpandedStoryIndex: (v) => { state.initiallyExpandedStoryIndex = v; },
		setShowSourceOverlay: (v) => { state.showSourceOverlay = v; },
		setCurrentSource: (v) => { state.currentSource = v; },
		setSourceArticles: (v) => { state.sourceArticles = v; },
		setCurrentMediaInfo: (v) => { state.currentMediaInfo = v; },
		setIsLoadingMediaInfo: (v) => { state.isLoadingMediaInfo = v; },
		setWikipediaPopup: (v) => { state.wikipediaPopup = v; },
		setShowSearchModal: (v) => { state.showSearchModal = v; },
		setIsSharedArticleView: (v) => { state.isSharedArticleView = v; },
		setSharedArticleIndex: (v) => { state.sharedArticleIndex = v; },
		setSharedClusterId: (v) => { state.sharedClusterId = v; },
		setReadStories: (v) => { state.readStories = v; },
		setTotalStoriesRead: (v) => { state.totalStoriesRead = v; },
		handleCategoryChange: (...args) => categoryManager.handleCategoryChange(...args),
		handleStoryToggle: (...args) => storyToggle.handleToggle(...args),
	},
);

// Data handlers
const dataHandlers = useDataHandlers(
	{
		get categories() { return state.categories; },
		set categories(v) { state.categories = v; },
		get stories() { return state.stories; },
		set stories(v) { state.stories = v; },
		get totalReadCount() { return state.totalReadCount; },
		set totalReadCount(v) { state.totalReadCount = v; },
		get lastUpdated() { return state.lastUpdated; },
		set lastUpdated(v) { state.lastUpdated = v; },
		get lastUpdatedTimestamp() { return state.lastUpdatedTimestamp; },
		set lastUpdatedTimestamp(v) { state.lastUpdatedTimestamp = v; },
		get currentCategory() { return state.currentCategory; },
		set currentCategory(v) { state.currentCategory = v; },
		get allCategoryStories() { return state.allCategoryStories; },
		set allCategoryStories(v) { state.allCategoryStories = v; },
		get categoryMap() { return state.categoryMap; },
		set categoryMap(v) { state.categoryMap = v; },
		get currentBatchId() { return state.currentBatchId; },
		set currentBatchId(v) { state.currentBatchId = v; },
		get currentDateSlug() { return state.currentDateSlug; },
		set currentDateSlug(v) { state.currentDateSlug = v; },
		get currentBatchCreatedAt() { return state.currentBatchCreatedAt; },
		set currentBatchCreatedAt(v) { state.currentBatchCreatedAt = v; },
		get lastLoadedCategory() { return state.lastLoadedCategory; },
		set lastLoadedCategory(v) { state.lastLoadedCategory = v; },
		get isLatestBatch() { return state.isLatestBatch; },
		set isLatestBatch(v) { state.isLatestBatch = v; },
		get chaosIndex() { return state.chaosIndex; },
		set chaosIndex(v) { state.chaosIndex = v; },
		get temporaryCategory() { return state.temporaryCategory; },
		set temporaryCategory(v) { state.temporaryCategory = v; },
		get showTemporaryCategoryTooltip() { return state.showTemporaryCategoryTooltip; },
		set showTemporaryCategoryTooltip(v) { state.showTemporaryCategoryTooltip = v; },
		get dataLoaded() { return state.dataLoaded; },
		set dataLoaded(v) { state.dataLoaded = v; },
		get isLoadingCategory() { return state.isLoadingCategory; },
		set isLoadingCategory(v) { state.isLoadingCategory = v; },
		get onThisDayEvents() { return state.onThisDayEvents; },
		set onThisDayEvents(v) { state.onThisDayEvents = v; },
		get onThisDayLanguage() { return state.onThisDayLanguage; },
		set onThisDayLanguage(v) { state.onThisDayLanguage = v; },
		get expandedStories() { return state.expandedStories; },
		set expandedStories(v) { state.expandedStories = v; },
		get initiallyExpandedStoryIndex() { return state.initiallyExpandedStoryIndex; },
		set initiallyExpandedStoryIndex(v) { state.initiallyExpandedStoryIndex = v; },
		get storyCountOverride() { return state.storyCountOverride; },
		set storyCountOverride(v) { state.storyCountOverride = v; },
	},
	{
		updatePageTitle: (categoryId: string) => categoryManager.updatePageTitle(categoryId),
		closeSourceOverlay: helpers.handleCloseSource,
		closeWikipediaPopup: helpers.closeWikipediaPopup,
		historyManager: state.historyManager,
		parseInitialUrl,
		s,
	},
);

// Category manager
const categoryManager = useCategoryManager(() => ({
	categories: state.categories,
	currentCategory: state.currentCategory,
	temporaryCategory: state.temporaryCategory,
	historyManager: state.historyManager,
	isSinglePageMode: derived.isSinglePageMode,
	storyList: state.storyList,
	loadStoriesForCategory: dataHandlers.loadStoriesForCategory,
	updatePageTitle: (categoryId: string) => categoryManager.updatePageTitle(categoryId),
	setCurrentCategory: (categoryId: string) => { state.currentCategory = categoryId; },
	clearExpandedStories: () => { state.expandedStories = {}; },
	clearInitiallyExpandedStoryIndex: () => { state.initiallyExpandedStoryIndex = null; },
	clearStoryCountOverride: () => { state.storyCountOverride = null; },
	clearTemporaryCategory: () => {
		state.temporaryCategory = null;
		state.showTemporaryCategoryTooltip = false;
	},
}));

// Story toggle handler
const storyToggle = useStoryToggle(
	() => state.expandedStories,
	(value) => { state.expandedStories = value; },
	() => state.readStories,
	(value) => { state.readStories = value; },
	state.initiallyExpandedStoryIndex,
	() => state.historyManager,
	() => ({
		isSinglePageMode: derived.isSinglePageMode,
		singlePageStories: derived.singlePageStories,
		stories: state.stories,
		currentBatchId: state.currentBatchId,
		categoryMap: state.categoryMap,
		currentCategory: state.currentCategory,
		handleCategoryChange: categoryManager.handleCategoryChange,
	}),
);

// Page setup (onMount)
usePageSetup({
	parseInitialUrl,
	s,
	setIsLoadingCategory: (v) => { state.isLoadingCategory = v; },
	setIsSharedArticleView: (v) => { state.isSharedArticleView = v; },
	setSharedArticleIndex: (v) => { state.sharedArticleIndex = v; },
	reloadReadStories: helpers.reloadReadStories,
});

// Page effects
usePageEffects(() => ({
	dataLoaded: state.dataLoaded,
	orderedCategories: derived.orderedCategories,
	currentCategory: state.currentCategory,
	temporaryCategory: state.temporaryCategory,
	loadStoriesForCategory: dataHandlers.loadStoriesForCategory,
	handleCategoryChange: categoryManager.handleCategoryChange,
	setCurrentCategory: (v) => { state.currentCategory = v; },
}));

// Single page mode effects
useSinglePageMode(() => ({
	isSinglePageMode: derived.isSinglePageMode,
	dataLoaded: state.dataLoaded,
	orderedCategories: derived.orderedCategories,
	loadStoriesForCategory: dataHandlers.loadStoriesForCategory,
	historyManager: state.historyManager,
	currentCategory: state.currentCategory,
}));

// Effect to update read stories count
$effect(() => {
	const readCount = Object.values(state.readStories).filter(Boolean).length;
	state.totalStoriesRead = readCount;
});

// Effect to update temporary category element reference
$effect(() => {
	if (state.temporaryCategory && state.desktopCategoryNavigation && state.showTemporaryCategoryTooltip) {
		state.temporaryCategoryElement = state.desktopCategoryNavigation.getCategoryElement(state.temporaryCategory);
	} else {
		state.temporaryCategoryElement = null;
	}
});

// Handle URL navigation
const handleUrlNavigation = async (params: NavigationParams) => {
	const hasStory = (params.storyIndex !== null && params.storyIndex !== undefined) ||
	                 (params.clusterId !== null && params.clusterId !== undefined);

	if (params.isShared && hasStory) {
		state.sharedArticleIndex = params.storyIndex ?? null;
		state.sharedClusterId = params.clusterId ?? null;
	} else if (!params.isShared) {
		state.sharedArticleIndex = null;
		state.sharedClusterId = null;
	}

	const updates = await navigationHandlerService.handleUrlNavigation(
		params,
		{
			currentBatchId: state.currentBatchId,
			currentDateSlug: state.currentDateSlug,
			currentCategory: state.currentCategory,
			categories: state.categories,
			stories: state.stories,
			allCategoryStories: state.allCategoryStories,
			expandedStories: state.expandedStories,
			isLatestBatch: state.isLatestBatch,
			storyCountOverride: state.storyCountOverride,
		},
		{
			setDataLanguage: (lang: SupportedLanguage) => {
				languageSettings.data = lang;
				settings.dataLanguage.save();
			},
			getCurrentDataLanguage: () => languageSettings.data,
			handleCategoryChange: categoryManager.handleCategoryChange,
		},
	);

	if (updates.isLatestBatch !== undefined) state.isLatestBatch = updates.isLatestBatch;
	if (updates.expandedStories !== undefined) {
		state.expandedStories = updates.expandedStories;
	}
	if (updates.storyCountOverride !== undefined) {
		state.storyCountOverride = updates.storyCountOverride;
	}
};

// Debug helpers
if (browser && typeof window !== 'undefined') {
	window.kiteDebug = {
		getCacheStats: getImageCacheStats,
		clearCache: clearImageCache,
		preloadCurrentCategory: () => imagePreloadingService.preloadCategory(state.stories),
		getCurrentStories: () => state.stories,
		getCurrentCategory: () => state.currentCategory,
		getAllCategoryStories: () => state.allCategoryStories,
		getPreloadedCategories: () => Object.keys(state.allCategoryStories),
		getImageUrls: () => {
			const allUrls: string[] = [];
			state.stories.forEach((story) => {
				allUrls.push(...extractStoryImages(story));
			});
			return [...new Set(allUrls)];
		},
		getAllImageUrls: () => {
			const allUrls: string[] = [];
			Object.values(state.allCategoryStories)
				.flat()
				.forEach((story) => {
					allUrls.push(...extractStoryImages(story));
				});
			return [...new Set(allUrls)];
		},
		showPreloadingSettings: () => {
			console.log('🔧 Enabling preloading settings tab');
			if (window.kiteSettingsDebug?.enablePreloadingTab) {
				window.kiteSettingsDebug.enablePreloadingTab();
				console.log('✅ Preloading settings tab enabled permanently.');
				return '✅ Preloading tab enabled permanently.';
			} else {
				console.log('❌ Settings component not available.');
				return '❌ Settings component not available.';
			}
		},
		hidePreloadingSettings: () => {
			console.log('🔧 Disabling preloading settings tab');
			if (window.kiteSettingsDebug?.disablePreloadingTab) {
				window.kiteSettingsDebug.disablePreloadingTab();
				console.log('✅ Preloading settings tab disabled.');
				return '✅ Preloading tab disabled.';
			} else {
				console.log('❌ Settings component not available.');
				return '❌ Settings component not available.';
			}
		},
		resetOnboarding: () => {
			localStorage.removeItem('kite-onboarding-completed');
			localStorage.setItem('introShown', 'false');
			console.log('✅ Onboarding reset.');
			return 'Onboarding reset.';
		},
		showOnboarding: () => {
			{ state.showOnboarding = true; }
			console.log('✅ Showing onboarding modal.');
			return 'Showing onboarding modal.';
		},
	};
}
</script>

<svelte:head>
  <link rel="preload" as="image" href="/doggo_default.svg" />
</svelte:head>

{#if !state.dataLoaded}
  {@const urlParams = parseInitialUrl()}
  <DataLoader
    onDataLoaded={dataHandlers.handleDataLoaded}
    onError={dataHandlers.handleDataError}
    initialBatchId={urlParams.batchId}
    initialCategoryId={urlParams.categoryId}
  />
{:else if displaySettings.showIntro || state.showAboutPage}
  <IntroScreen visible={true} onClose={helpers.handleIntroClose} />
{:else}
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
  >
    {s("ui.skipToMainContent") || "Skip to main content"}
  </a>

  <HistoryManager
    bind:this={state.historyManager}
    batchId={state.currentBatchId}
    dateSlug={state.currentDateSlug}
    batchCreatedAt={state.currentBatchCreatedAt}
    categoryId={state.currentCategory}
    storyIndex={derived.currentStoryIndex}
    stories={derived.isSinglePageMode ? derived.singlePageStories : state.stories}
    isLatestBatch={state.isLatestBatch}
    bind:isSharedView={state.isSharedArticleView}
    onNavigate={handleUrlNavigation}
  />

  <div class="md:hidden sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm relative">
    <div class="container mx-auto {getContainerWidthClass()} px-4 pt-8 pb-2">
      <Header
        offlineMode={state.offlineMode}
        totalReadCount={state.totalReadCount}
        totalStoriesRead={state.totalStoriesRead}
        getLastUpdated={helpers.getLastUpdated}
        lastUpdatedTimestamp={state.lastUpdatedTimestamp}
        chaosIndex={state.chaosIndex}
        dataLoaded={state.dataLoaded}
        isSharedView={state.isSharedArticleView}
        onLogoClick={helpers.handleLogoClick}
        onSearchClick={() => (state.showSearchModal = true)}
      />
    </div>
    {#if derived.categoryHeaderPosition === "top" && !state.isSharedArticleView && !derived.isSinglePageMode}
      <CategoryNavigation
        categories={derived.orderedCategories}
        currentCategory={state.currentCategory}
        onCategoryChange={categoryManager.handleCategoryChange}
        onCategoryDoubleClick={() => state.storyList?.toggleExpandAll()}
        mobilePosition="integrated"
        temporaryCategory={state.temporaryCategory}
        showTemporaryTooltip={false}
      />
    {/if}
  </div>

  {#if derived.categoryHeaderPosition === "bottom" && !state.isSharedArticleView && !derived.isSinglePageMode}
    <div class="md:hidden">
      <CategoryNavigation
        categories={derived.orderedCategories}
        currentCategory={state.currentCategory}
        onCategoryChange={categoryManager.handleCategoryChange}
        onCategoryDoubleClick={() => state.storyList?.toggleExpandAll()}
        mobilePosition="bottom"
        temporaryCategory={state.temporaryCategory}
        showTemporaryTooltip={false}
      />
    </div>
  {/if}

  <main
    class="pb-[56px] md:pb-0 relative z-20 {derived.categoryHeaderPosition === 'top' ? 'pt-0' : ''}"
    ontouchstart={categorySwipeHandler.handleTouchStart}
    ontouchmove={categorySwipeHandler.handleTouchMove}
    ontouchend={categorySwipeHandler.handleTouchEnd}
  >
    <div class="container mx-auto {getContainerWidthClass()} px-4 py-8">
      <div class="hidden md:block">
        <Header
          offlineMode={state.offlineMode}
          totalReadCount={state.totalReadCount}
          totalStoriesRead={state.totalStoriesRead}
          getLastUpdated={helpers.getLastUpdated}
          lastUpdatedTimestamp={state.lastUpdatedTimestamp}
          chaosIndex={state.chaosIndex}
          dataLoaded={state.dataLoaded}
          isSharedView={state.isSharedArticleView}
          onLogoClick={helpers.handleLogoClick}
          onSearchClick={() => (state.showSearchModal = true)}
        />
      </div>

      {#if !state.isSharedArticleView && !derived.isSinglePageMode}
        <div class="hidden md:block">
          <CategoryNavigation
            bind:this={state.desktopCategoryNavigation}
            categories={derived.orderedCategories}
            currentCategory={state.currentCategory}
            onCategoryChange={categoryManager.handleCategoryChange}
            onCategoryDoubleClick={() => state.storyList?.toggleExpandAll()}
            mobilePosition="bottom"
            temporaryCategory={state.temporaryCategory}
            showTemporaryTooltip={state.showTemporaryCategoryTooltip}
            onTemporaryScrollStart={() => { state.showTemporaryCategoryTooltip = false; }}
            onTemporaryScrollEnd={() => { state.showTemporaryCategoryTooltip = true; }}
          />
        </div>
      {/if}

      <div id="main-content">
        {#if state.isSharedArticleView}
          <div class="mt-4 mb-6 border-l-4 border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 pl-4 pr-3 py-3 flex items-center justify-between gap-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              {s("shared.viewingStoryFrom", {
                date: new Date(state.currentBatchCreatedAt).toLocaleDateString(languageSettings.ui === 'default' ? undefined : languageSettings.ui, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              }) || `Viewing a shared story from ${new Date(state.currentBatchCreatedAt).toLocaleDateString(languageSettings.ui === 'default' ? undefined : languageSettings.ui, { year: 'numeric', month: 'long', day: 'numeric' })}`}
            </p>
            <button
              onclick={helpers.handleExitSharedView}
              class="flex-shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors underline"
            >
              {s("shared.viewLatest") || "View latest stories"}
            </button>
          </div>
        {/if}

        {#if state.isLoadingCategory}
          <div class="min-h-[300px] flex flex-col items-center justify-center py-20" aria-live="polite" aria-busy="true">
            <IconLoader2 class="h-12 w-12 text-amber-500 animate-spin" aria-hidden="true" />
            <span class="mt-3 text-sm text-gray-600 dark:text-gray-400">{s("loading.stories") || "Loading stories..."}</span>
          </div>
        {:else if derived.isSinglePageMode}
          <StoryList
            bind:this={state.storyList}
            stories={derived.singlePageStories}
            currentCategory="all"
            categoryUuid=""
            batchId={state.currentBatchId}
            batchDateSlug={state.currentDateSlug}
            bind:expandedStories={state.expandedStories}
            onStoryToggle={storyToggle.handleToggle}

            bind:readStories={state.readStories}
            bind:showSourceOverlay={state.showSourceOverlay}
            bind:currentSource={state.currentSource}
            bind:sourceArticles={state.sourceArticles}
            bind:currentMediaInfo={state.currentMediaInfo}
            bind:isLoadingMediaInfo={state.isLoadingMediaInfo}
            storyCountOverride={null}
            isSharedView={state.isSharedArticleView}
            sharedArticleIndex={state.sharedArticleIndex}
            sharedClusterId={state.sharedClusterId}
            initiallyExpandedIndex={state.initiallyExpandedStoryIndex}
            showCategoryLabels={derived.singlePageMode === 'sequential'}
            skipStoryCountLimit={true}
          />
        {:else if state.currentCategory === "onthisday"}
          <OnThisDay
            stories={state.onThisDayEvents}
            language={state.onThisDayLanguage}
            onWikipediaClick={helpers.handleWikipediaClick}
          />
        {:else}
          {#if state.currentCategory.toLowerCase() === "nhl"}
            <NHLScores />
            <NHLStandings />
          {/if}
          {#if state.currentCategory.toLowerCase() === "nfl"}
            <NFLScores />
            <NFLStandings />
          {/if}
          {#if state.currentCategory.toLowerCase() === "formula_1"}
            <F1Schedule />
            <F1Standings />
          {/if}
          {#if state.currentCategory.toLowerCase() === "bitcoin"}
            <CryptoPrice cryptoId="bitcoin" />
          {/if}
          {#if state.currentCategory.toLowerCase() === "cryptocurrency"}
            <CryptoGrid />
          {/if}
          <!-- Weather widgets temporarily hidden -->
          <!-- {#if state.currentCategory.toLowerCase() === "bay"}
            <Weather location="san-francisco" />
          {/if}
          {#if state.currentCategory.toLowerCase() === "usa_|_new_york_city"}
            <Weather location="new-york" />
          {/if}
          {#if state.currentCategory.toLowerCase() === "usa_|_austin,_tx"}
            <Weather location="austin" />
          {/if} -->

          <StoryList
            bind:this={state.storyList}
            stories={state.stories}
            currentCategory={state.currentCategory}
            categoryUuid={state.categoryMap[state.currentCategory]}
            batchId={state.currentBatchId}
            batchDateSlug={state.currentDateSlug}
            bind:expandedStories={state.expandedStories}
            onStoryToggle={storyToggle.handleToggle}

            bind:readStories={state.readStories}
            bind:showSourceOverlay={state.showSourceOverlay}
            bind:currentSource={state.currentSource}
            bind:sourceArticles={state.sourceArticles}
            bind:currentMediaInfo={state.currentMediaInfo}
            bind:isLoadingMediaInfo={state.isLoadingMediaInfo}
            storyCountOverride={state.storyCountOverride}
            isSharedView={state.isSharedArticleView}
            sharedArticleIndex={state.sharedArticleIndex}
            sharedClusterId={state.sharedClusterId}
            initiallyExpandedIndex={state.initiallyExpandedStoryIndex}
          />
        {/if}
      </div>

      <Footer
        currentCategory={state.currentCategory}
        categories={state.categories}
        stories={state.stories}
        onShowAbout={() => { displaySettings.showIntro = true; }}
      />
    </div>
  </main>
{/if}

<Settings
  visible={settingsModalState.isOpen}
  categories={state.categories}
  onClose={() => { settingsModalState.isOpen = false; }}
  onShowAbout={() => {
    settingsModalState.isOpen = false;
    displaySettings.showIntro = true;
  }}
/>

<TimeTravel />

<SourceOverlay
  isOpen={state.showSourceOverlay}
  currentSource={state.currentSource}
  sourceArticles={state.sourceArticles}
  currentMediaInfo={state.currentMediaInfo}
  isLoadingMediaInfo={state.isLoadingMediaInfo}
  onClose={helpers.handleCloseSource}
/>

<WikipediaPopup
  visible={state.wikipediaPopup.visible}
  title={state.wikipediaPopup.title}
  content={state.wikipediaPopup.content}
  imageUrl={state.wikipediaPopup.imageUrl}
  onClose={helpers.closeWikipediaPopup}
/>

<TemporaryCategoryTooltip
  show={state.showTemporaryCategoryTooltip}
  referenceElement={state.temporaryCategoryElement}
/>

<SearchModal
  visible={state.showSearchModal}
  allCategoryStories={state.allCategoryStories}
  categories={state.categories}
  currentCategory={state.currentCategory}
  onClose={() => (state.showSearchModal = false)}
  onSelectStory={helpers.handleSearchSelectStory}
/>

{#if state.dataLoaded && !state.showOnboarding && !displaySettings.showIntro}
  <BackToTop />
{/if}

<Toast />

{#if state.dataLoaded}
<KeyboardNavigationHandler
	stories={state.stories}
	currentCategory={state.currentCategory}
	categories={derived.orderedCategories}
	expandedStories={state.expandedStories}
	showSourceOverlay={state.showSourceOverlay}
	wikipediaPopupVisible={state.wikipediaPopup.visible}
	settingsModalOpen={settingsModalState.isOpen}
	bind:showSearchModal={state.showSearchModal}
	onStoryToggle={storyToggle.handleToggle}
	onToggleReadStatus={(index) => state.storyList?.toggleReadStatus(index)}
	onCategoryChange={categoryManager.handleCategoryChange}
/>
{/if}

<KeyboardShortcutsHelp />
