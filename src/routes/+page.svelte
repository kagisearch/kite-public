<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { s } from "$lib/client/localization.svelte";
  import BackToTop from "$lib/components/BackToTop.svelte";
  import CategoryNavigation from "$lib/components/CategoryNavigation.svelte";
  import DataLoader from "$lib/components/DataLoader.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import HistoryManager from "$lib/components/HistoryManager.svelte";
  import IntroScreen from "$lib/components/IntroScreen.svelte";
  import OnThisDay from "$lib/components/OnThisDay.svelte";
  import Settings from "$lib/components/Settings.svelte";
  import SourceOverlay from "$lib/components/SourceOverlay.svelte";
  import StoryList from "$lib/components/StoryList.svelte";
  import TemporaryCategoryTooltip from "$lib/components/TemporaryCategoryTooltip.svelte";
  import TimeTravel from "$lib/components/TimeTravel.svelte";
  import WikipediaPopup from "$lib/components/WikipediaPopup.svelte";
  import { SearchModal } from "$lib/components/search";
  import { kiteDB } from "$lib/db/dexie";
  import { dataService } from "$lib/services/dataService";
  import { imagePreloadingService } from "$lib/services/imagePreloadingService";
  import { navigationHandlerService } from "$lib/services/navigationHandlerService";
  import { timeTravelNavigationService } from "$lib/services/timeTravelNavigationService";
  import {
    UrlNavigationService,
    type NavigationParams,
  } from "$lib/services/urlNavigationService";
  import { categories as categoriesStore } from "$lib/stores/categories.svelte.js";
  import { dataLanguage } from "$lib/stores/dataLanguage.svelte.js";
  import type { SupportedLanguage } from "$lib/stores/language.svelte";
  import { pageMetadata } from "$lib/stores/pageMetadata.svelte.js";
  import { settings } from "$lib/stores/settings.svelte.js";
  import { storyCount } from "$lib/stores/storyCount.svelte.js";
  import type { Category, Story, OnThisDayEvent } from "$lib/types";
  import { getCategoryDisplayName } from "$lib/utils/category";
  import { categorySwipeHandler } from "$lib/utils/categorySwipeHandler";
  import { formatTimeAgo } from "$lib/utils/formatTimeAgo";
  import {
    clearImageCache,
    getImageCacheStats,
    extractStoryImages,
  } from "$lib/utils/imagePreloader";
  import { generateStoryId } from "$lib/utils/storyId";
  import { onMount } from "svelte";
  import { base } from "$app/paths";

  // Local ref types to avoid importing component types in script
  type StoryListRef = { toggleExpandAll: () => void };
  type HistoryManagerRef = { updateUrl: (params: { categoryId?: string; storyIndex?: number | null }) => void };
  type CategoryNavigationRef = { getCategoryElement: (id: string) => HTMLElement | null };

  type SourceInfo = {
    name?: string;
    country?: string;
    owner?: string;
    organization?: string;
    typology?: string;
    description?: string;
  };
  type SourceArticle = { image?: string; link: string; title: string; date: string | number | Date };

  // Global window types are declared in src/global.d.ts

  // App state
  // ci: workflow demo trigger comment
  let dataLoaded = $state(false);
  const offlineMode = $state(false);
  let lastLoadedCategory = $state(""); // Track last loaded category to prevent duplicates
  let temporaryCategory = $state<string | null>(null);
  let showTemporaryCategoryTooltip = $state(false);
  let temporaryCategoryElement = $state<HTMLElement | null>(null);
  let desktopCategoryNavigation = $state<CategoryNavigationRef | undefined>();
  let storyCountOverride = $state<number | null>(null);
  let showOnboarding = $state(false);
  let showSearchModal = $state(false);
  let isSharedArticleView = $state(false);
  let sharedArticleIndex = $state<number | null>(null);

  // Reactive category header position
  const categoryHeaderPosition = $derived(settings.categoryHeaderPosition);

  const storyExpandMode = $derived(settings.storyExpandMode);

  // Function to update page title based on current category
  function updatePageTitle(categoryId: string) {
    // Find the category object if categories are loaded
    const categoryObj = categories.find((c) => c.id === categoryId);

    // Get localized display name
    let displayName: string;
    if (categoryObj) {
      displayName = getCategoryDisplayName(categoryObj);
    } else {
      // Fallback if category not found (shouldn't happen)
      displayName = categoryId;
    }

    // Create the title - just the category name, no suffix
    const title = displayName;

    // Update the metadata store for SSR/meta tags
    pageMetadata.title = title;

    // Directly update document title for immediate effect in browser
    if (browser && document) {
      document.title = title;
    }
  }

  // Data state
  let categories = $state<Category[]>([]);
  let currentCategory = $state("World");
  let stories = $state<Story[]>([]);
  let onThisDayEvents = $state<OnThisDayEvent[]>([]);
  let readStories = $state<Record<string, boolean>>({});
  let totalReadCount = $state(0);
  let totalStoriesRead = $state(0);
  let lastUpdated = $state("");
  let allCategoryStories = $state<Record<string, Story[]>>({});
  let categoryMap = $state<Record<string, string>>({}); // Map category ID to UUID
  let currentBatchId = $state<string>("");
  let currentBatchCreatedAt = $state<string>("");

  // Component references
  let storyList = $state<StoryListRef | undefined>();

  // State for source overlay
  let showSourceOverlay = $state(false);
  let currentSource = $state<SourceInfo | null>(null);
  let sourceArticles = $state<SourceArticle[]>([]);
  let currentMediaInfo = $state<SourceInfo | null>(null);
  let isLoadingMediaInfo = $state(false);

  // State for chaos index
  let chaosIndex = $state({
    score: 0,
    summary: "",
    lastUpdated: "",
  });

  // State for view mode (currently unused but reserved for future map view)
  // let viewMode = $state<'list' | 'map'>('list');

  // State for Wikipedia popup
  let wikipediaPopup = $state({
    visible: false,
    title: "",
    content: "",
    imageUrl: "",
  });

  // State for story URL management - Initialize with empty reactive objects
  let expandedStories = $state<Record<string, boolean>>({});
  let isLatestBatch = $state(true);
  let historyManager = $state<HistoryManagerRef | undefined>();

  // Compute current story index from expanded stories
  const currentStoryIndex = $derived.by(() => {
    const expandedStoryId = Object.keys(expandedStories).find(
      (id) => expandedStories[id],
    );
    if (!expandedStoryId) return null;

    const story = stories.find(
      (s) =>
        s.cluster_number?.toString() === expandedStoryId ||
        s.title === expandedStoryId,
    );

    return story ? stories.indexOf(story) : null;
  });

  // Create ordered categories based on store order
  const orderedCategories = $derived.by(() => {
    if (categories.length === 0 || categoriesStore.enabled.length === 0) {
      return categories;
    }

    // Filter only enabled categories and order them according to store order
    // Now that the store always uses IDs, we only need to check cat.id
    const enabledCategories = categories.filter(
      (cat) =>
        categoriesStore.enabled.includes(cat.id) ||
        (temporaryCategory && cat.id === temporaryCategory), // Include temporary category
    );

    // Sort by store order
    return enabledCategories.sort((a, b) => {
      // Temporary category should appear where it would naturally fit
      if (a.id === temporaryCategory) return -1;
      if (b.id === temporaryCategory) return 1;

      const aIndex = categoriesStore.enabled.findIndex((id) => id === a.id);
      const bIndex = categoriesStore.enabled.findIndex((id) => id === b.id);
      return aIndex - bIndex;
    });
  });

  // Data loading functions
  function handleDataLoaded(data: {
    categories: Category[];
    stories: Story[];
    totalReadCount: number;
    lastUpdated: string;
    currentCategory: string;
    allCategoryStories: Record<string, Story[]>;
    categoryMap: Record<string, string>;
    batchId: string;
    batchCreatedAt?: string;
    chaosIndex?: number;
    chaosDescription?: string;
    chaosLastUpdated?: string;
    isLatestBatch: boolean;
    temporaryCategory?: string | null;
  }) {
    // Reset app state for fresh data
    expandedStories = {};
    lastLoadedCategory = "";

    // Close any open overlays
    if (showSourceOverlay) {
      handleCloseSource();
    }
    if (wikipediaPopup.visible) {
      closeWikipediaPopup();
    }

    // Load new data
    categories = data.categories;
    stories = data.stories;
    totalReadCount = data.totalReadCount;
    lastUpdated = data.lastUpdated;
    currentCategory = data.currentCategory;
    allCategoryStories = data.allCategoryStories;
    categoryMap = data.categoryMap;
    currentBatchId = data.batchId;
    currentBatchCreatedAt = data.batchCreatedAt || new Date().toISOString();
    lastLoadedCategory = data.currentCategory; // Set the guard for initial load

    // Update the page title with the initial category
    updatePageTitle(currentCategory);

    // Use the isLatestBatch value from DataLoader
    isLatestBatch = data.isLatestBatch;

    // Set chaos index from initial load
    if (
      data.chaosIndex !== undefined &&
      data.chaosDescription &&
      data.chaosLastUpdated
    ) {
      chaosIndex = {
        score: data.chaosIndex,
        summary: data.chaosDescription,
        lastUpdated: data.chaosLastUpdated,
      };
    }

    // Handle temporary category
    if (data.temporaryCategory) {
      temporaryCategory = data.temporaryCategory;
      showTemporaryCategoryTooltip = true;
    }

    dataLoaded = true;

    console.log(
      `🚀 Loaded ${Object.keys(allCategoryStories).length} categories with ${Object.values(allCategoryStories).flat().length} total stories`,
    );

    // After initial data load, check if we need to handle story expansion from URL
    if (browser) {
      const urlParams = parseInitialUrl();
      if (
        urlParams.storyIndex !== undefined &&
        urlParams.storyIndex !== null &&
        stories[urlParams.storyIndex]
      ) {
        // Expand the story from URL
        const story = stories[urlParams.storyIndex];
        const storyId = story.cluster_number?.toString() || story.title;
        expandedStories[storyId] = true;

        // Check if we need to override story count limit
        if (urlParams.storyIndex >= storyCount.current) {
          storyCountOverride = urlParams.storyIndex + 1;
        }

        // Shared article state is set in onMount to avoid mutation in derived
      }
    }
  }

  function handleDataError(error: string) {
    console.error("Data loading error:", error);
    // Could show error state here if needed
    dataLoaded = true; // Still show the app with fallback data
  }

  async function loadStoriesForCategory(categoryId: string) {
    // Handle OnThisDay separately
    if (categoryId === "onthisday") {
      await loadOnThisDayEvents();
      return;
    }

    // Check if we already have preloaded stories for this category
    if (allCategoryStories[categoryId]) {
      console.log(`⚡ Using preloaded stories for category: ${categoryId}`);
      stories = allCategoryStories[categoryId];
      lastLoadedCategory = categoryId;
      // Images should already be preloaded from DataLoader
      return;
    }

    // Fallback: Load from API if not preloaded (shouldn't happen for enabled categories)
    if (lastLoadedCategory === categoryId) {
      return;
    }

    // Check if we have a UUID mapping for this category
    const categoryUuid = categoryMap[categoryId];
    if (!categoryUuid) {
      console.warn(
        `Category UUID not found for ${categoryId}, cannot load stories`,
      );
      stories = [];
      return;
    }

    try {
      console.log(
        `📡 Loading stories from API for category: ${categoryId} (not preloaded)`,
      );
      lastLoadedCategory = categoryId;
      const result = await dataService.loadStories(
        currentBatchId,
        categoryUuid,
        12,
        dataLanguage.current,
      );
      stories = result.stories;
      totalReadCount = result.readCount;
      lastUpdated = formatTimeAgo(result.timestamp, s);

      // Cache the loaded stories for this category
      allCategoryStories[categoryId] = stories;
      console.log(`💾 Cached stories for category: ${categoryId}`);
    } catch (error) {
      console.error("Error loading stories for category:", categoryId, error);
      // DON'T reset the guard - give up and stop retrying
      // Keep existing stories on error
    }
  }

  async function loadOnThisDayEvents() {
    try {
      lastLoadedCategory = "onthisday";
      const events = await dataService.loadOnThisDayEvents(
        dataLanguage.current,
      );
      onThisDayEvents = events;
      // OnThisDay doesn't have read count or timestamp in the same format
      // We could add these later if needed
    } catch (error) {
      console.error("Error loading OnThisDay events:", error);
      // Keep existing events on error
    }
  }

  onMount(() => {
    // Preload search doggo icon to prevent flicker
    const doggoImg = new Image();
    doggoImg.src = `${base}/doggo_default.svg`;

    // Check for data language in URL first
    const urlParams = parseInitialUrl();
    if (urlParams.dataLang && urlParams.dataLang !== dataLanguage.current) {
      // Validate it's a supported language
      if (UrlNavigationService.isValidDataLanguage(urlParams.dataLang)) {
        console.log(
          "Setting data language from URL on mount:",
          urlParams.dataLang,
        );
        dataLanguage.set(urlParams.dataLang as SupportedLanguage);
      }
    }

    // Set intro as shown and onboarding as completed for all users
    if (browser) {
      localStorage.setItem("introShown", "true");
      localStorage.setItem("kite-onboarding-completed", "true");

      // Allow bypassing IntroScreen via query param for automation/Lighthouse
      try {
        const currentUrl = new URL(window.location.href);
        const skipIntro =
          currentUrl.searchParams.get("skip_intro") ||
          currentUrl.searchParams.get("lhci");
        if (skipIntro === "1" || skipIntro === "true") {
          settings.setShowIntro(false);
        }
      } catch (e) {
        // no-op
      }

      // Check if this is a shared article URL
      const urlParams = parseInitialUrl();
      const url = new URL(window.location.href);
      const isShared = url.searchParams.get("shared") === "1";
      if (
        isShared &&
        urlParams.storyIndex !== null &&
        urlParams.storyIndex !== undefined
      ) {
        isSharedArticleView = true;
        sharedArticleIndex = urlParams.storyIndex;
      }
    }

    // Migrate from localStorage to IndexedDB if needed (async but non-blocking)
    (async () => {
      await kiteDB.migrateFromLocalStorage();

      // Load saved read stories from IndexedDB
      try {
        const storyIds = await kiteDB.getReadStoryIds();
        // Convert Set back to Record format for UI compatibility
        readStories = {};
        for (const id of storyIds) {
          readStories[id] = true;
        }
        totalStoriesRead = storyIds.size;
      } catch (error) {
        console.error("Error loading saved stories:", error);
        readStories = {};
        totalStoriesRead = 0;
      }
    })();

    // Handle URL hash navigation
    function handleHashChange() {
      const hash = window.location.hash.slice(1); // Remove the #
      if (hash.startsWith("settings")) {
        // Extract tab name if provided (e.g., #settings/filter)
        const parts = hash.split("/");
        const tab = parts[1] || undefined;
        settings.open(tab);
        // Clear the hash to avoid issues with back button
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Handle keyboard shortcuts
    function handleGlobalKeyDown(event: KeyboardEvent) {
      // Cmd+K or Ctrl+K to toggle search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        showSearchModal = !showSearchModal;
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });

  // Helper functions
  const getLastUpdated = (): string =>
    lastUpdated || s("loading.default") || "Loading...";
  const parseInitialUrl = (): NavigationParams => {
    if (!browser) return {};
    return UrlNavigationService.parseUrl(page.url);
  };
  const handleIntroClose = () => {
    settings.setShowIntro(false);
    // Check if we should show onboarding
    // Disabled - onboarding is set as completed by default
    /*if (
      browser &&
      localStorage.getItem("kite-onboarding-completed") !== "true"
    ) {
      showOnboarding = true;
    }*/
  };

  // Handle exiting shared article view
  const handleExitSharedView = () => {
    isSharedArticleView = false;
    sharedArticleIndex = null;

    // Remove shared parameter from URL without navigation
    if (browser && window.location.search.includes("shared=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("shared");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };

  // Handle category change
  function handleCategoryChange(category: string, updateUrl = true) {
    if (category === currentCategory) {
      return;
    }

    currentCategory = category;

    // Update the page title when category changes
    updatePageTitle(category);

    // Reset view mode when changing categories (when map view is implemented)
    // if (category.toLowerCase() !== 'world') {
    // 	viewMode = 'list';
    // }

    // Clear expanded stories when switching categories
    expandedStories = {};

    // Clear temporary category if user manually navigates
    if (updateUrl && temporaryCategory) {
      categoriesStore.removeTemporary();
      temporaryCategory = null;
      showTemporaryCategoryTooltip = false;
    }

    // Reset story count override when changing categories
    if (updateUrl && storyCountOverride !== null) {
      storyCountOverride = null;
    }

    // Load stories for the new category (will be instant for preloaded categories)
    loadStoriesForCategory(category);

    // Update URL to reflect new category (unless we're handling a URL change)
    if (
      historyManager &&
      updateUrl &&
      !navigationHandlerService.isNavigating()
    ) {
      historyManager.updateUrl({ categoryId: category, storyIndex: null });
    }

    if (storyExpandMode === "always") {
      storyList?.toggleExpandAll();
    }

    // Chaos index is already loaded with the batch data
  }

  // Wikipedia popup handlers
  const handleWikipediaClick = (
    title: string,
    content: string,
    imageUrl?: string,
  ) => {
    wikipediaPopup = {
      visible: true,
      title,
      content,
      imageUrl: imageUrl || "",
    };
  };

  const closeWikipediaPopup = () => {
    wikipediaPopup = { visible: false, title: "", content: "", imageUrl: "" };
  };

  // Handle story selection from search
  async function handleSearchSelectStory(
    categoryId: string,
    story: Story,
    batchId?: string,
    batchDate?: string,
  ) {
    // If we have a batchId from historical search
    if (batchId) {
      try {
        // Check if this is the latest batch
        const latestResponse = await fetch(
          `/api/batches/latest?lang=${dataLanguage.current}`,
        );
        const latestData = await latestResponse.json();
        const isSelectedBatchLatest =
          latestData.id && latestData.id === batchId;

        const storyIndex = story.cluster_number ? story.cluster_number - 1 : 0;

        if (!isSelectedBatchLatest) {
          // For historical batches, use the centralized service
          // Don't navigate yet - just load the data
          await timeTravelNavigationService.enterTimeTravel({
            batchId,
            batchDate, // Use the date directly from search results
            categoryId,
            storyIndex,
            reload: true,
            navigate: false, // Don't navigate, let HistoryManager handle URL update
          });

          // After data loads, close the search modal
          showSearchModal = false;

          // Navigate to the category and story
          if (categoryId !== currentCategory) {
            handleCategoryChange(categoryId, true);
          }

          // Expand the selected story
          const storyId = story.cluster_number?.toString() || story.title;
          handleStoryToggle(storyId, true);

          // Scroll to the story
          setTimeout(() => {
            const storyElement = document.querySelector(
              `[data-story-id="${storyId}"]`,
            );
            if (storyElement) {
              storyElement.scrollIntoView({
                behavior:
                  settings.storyOpenMode === "single" ? "instant" : "smooth",
                block: "center",
              });
            }
          }, 100);
        } else {
          // For latest batch, just navigate normally
          let targetUrl = "/";

          if (settings.useLatestUrls) {
            targetUrl = `/latest/${categoryId}/${storyIndex}`;
          } else {
            targetUrl = `/${batchId}/${categoryId}/${storyIndex}`;
          }

          await goto(targetUrl);
        }

        return;
      } catch (error) {
        console.error("Error handling batch selection from search:", error);
      }
    }

    // Current batch - just navigate to category and story
    if (categoryId !== currentCategory) {
      handleCategoryChange(categoryId, true);
    }

    // Expand the selected story after a brief delay to ensure category change completes
    setTimeout(() => {
      const storyId = story.cluster_number?.toString() || story.title;
      handleStoryToggle(storyId, true);

      // Scroll to the story
      const storyElement = document.querySelector(
        `[data-story-id="${storyId}"]`,
      );
      if (storyElement) {
        storyElement.scrollIntoView({
          behavior: settings.storyOpenMode === "single" ? "instant" : "smooth",
          block: "center",
        });
      }
    }, 100);
  }

  function handleStoryToggle(storyId: string, updateUrl = true) {
    // Check current state
    const currentlyExpanded = expandedStories[storyId];

    // Create a new object with existing expanded stories to ensure reactivity
    let newExpandedStories: Record<string, boolean> = { ...expandedStories };

    // Toggle the clicked story
    if (!currentlyExpanded) {
      // If single story mode is enabled, collapse all other stories first
      if (settings.storyOpenMode === "single") {
        newExpandedStories = {};
      }
      newExpandedStories[storyId] = true;

      // Find the story and mark it as read
      const story = stories.find(
        (s) => s.cluster_number?.toString() === storyId || s.title === storyId,
      );

      if (story) {
        // Mark as read - use proper story ID
        const uniqueStoryId = generateStoryId(
          story,
          currentBatchId,
          currentCategory,
        );
        console.log("Marking story as read:", {
          title: story.title,
          clusterNumber: story.cluster_number,
          currentBatchId,
          generatedId: uniqueStoryId,
        });
        readStories = { ...readStories, [uniqueStoryId]: true };

        // Also save to IndexedDB (non-blocking)
        kiteDB.markStoryAsRead(
          story.title,
          story.cluster_number,
          currentBatchId,
          currentCategory,
        );

        // Update URL with story index
        if (updateUrl && historyManager) {
          const storyIndex = stories.indexOf(story);
          if (storyIndex >= 0) {
            historyManager.updateUrl({ storyIndex });
          }
        }
      }
    } else {
      // Story is being collapsed
      delete newExpandedStories[storyId];

      // Remove from URL if this was the last expanded story
      if (
        updateUrl &&
        historyManager &&
        Object.keys(newExpandedStories).length === 0
      ) {
        historyManager.updateUrl({ storyIndex: null });
      }
    }

    // Assign the new object to trigger reactivity
    // Use requestAnimationFrame to ensure state updates properly
    requestAnimationFrame(() => {
      expandedStories = newExpandedStories;
    });
  }

  // Reactive effect to save read stories and update count
  $effect(() => {
    // Update total stories read count
    const readCount = Object.values(readStories).filter(Boolean).length;
    totalStoriesRead = readCount;

    // Note: Individual story reads are now persisted directly in handleReadToggle and markAllAsRead
    // This avoids the issue where bulkUpdateReadStories would lose story metadata
  });

  // Handle source overlay close
  const handleCloseSource = () => {
    showSourceOverlay = false;
    currentSource = null;
    sourceArticles = [];
    currentMediaInfo = null;
    isLoadingMediaInfo = false;
  };

  // Handle navigation from URL changes
  const handleUrlNavigation = async (params: NavigationParams) => {
    const updates = await navigationHandlerService.handleUrlNavigation(
      params,
      {
        currentBatchId,
        currentCategory,
        categories,
        stories,
        allCategoryStories,
        expandedStories,
        isLatestBatch,
        storyCountOverride,
      },
      {
        setDataLanguage: (lang: SupportedLanguage) => dataLanguage.set(lang),
        getCurrentDataLanguage: () => dataLanguage.current,
        handleCategoryChange,
      },
    );

    // Apply state updates
    if (updates.isLatestBatch !== undefined)
      isLatestBatch = updates.isLatestBatch;
    if (updates.expandedStories !== undefined) {
      // Directly set the expanded stories from navigation
      // Use requestAnimationFrame to ensure state updates properly
      requestAnimationFrame(() => {
        expandedStories = updates.expandedStories ?? {};
      });
    }
    if (updates.storyCountOverride !== undefined) {
      storyCountOverride = updates.storyCountOverride;
    }
  };

  // Single consolidated effect for category/language management
  $effect(() => {
    if (!dataLoaded) return;

    // Initialize category if needed
    // Don't reset if we have a temporary category that matches current
    if (
      orderedCategories.length > 0 &&
      !orderedCategories.find((cat) => cat.id === currentCategory) &&
      !(temporaryCategory && currentCategory === temporaryCategory)
    ) {
      currentCategory = orderedCategories[0].id;
      return; // Exit early, let the next effect run handle loading
    }

    // Update swipe handler
    if (orderedCategories.length > 0) {
      categorySwipeHandler.updateState(
        orderedCategories,
        currentCategory,
        handleCategoryChange,
      );
    }

    // Load stories if category is valid
    if (
      currentCategory &&
      orderedCategories.find((cat) => cat.id === currentCategory)
    ) {
      loadStoriesForCategory(currentCategory);
      // Removed chaos index loading here - it's already loaded from DataLoader
    }
  });

  // Language changes are now handled by DataLoader through the reload service
  // Chaos index will be reloaded with all other data when language changes

  // Update temporary category element reference when needed
  $effect(() => {
    if (
      temporaryCategory &&
      desktopCategoryNavigation &&
      showTemporaryCategoryTooltip
    ) {
      temporaryCategoryElement =
        desktopCategoryNavigation.getCategoryElement(temporaryCategory);
    }
    temporaryCategoryElement = null;
  });

  // Debug helper for testing (only in development)
  if (browser && typeof window !== "undefined") {
    window.kiteDebug = {
      getCacheStats: getImageCacheStats,
      clearCache: clearImageCache,
      preloadCurrentCategory: () =>
        imagePreloadingService.preloadCategory(stories),
      getCurrentStories: () => stories,
      getCurrentCategory: () => currentCategory,
      getAllCategoryStories: () => allCategoryStories,
      getPreloadedCategories: () => Object.keys(allCategoryStories),
      getImageUrls: () => {
        const allUrls: string[] = [];
        for (const story of stories) {
          allUrls.push(...extractStoryImages(story));
        }
        return [...new Set(allUrls)];
      },
      getAllImageUrls: () => {
        const allUrls: string[] = [];
        for (const story of Object.values(allCategoryStories).flat()) {
          allUrls.push(...extractStoryImages(story));
        }
        return [...new Set(allUrls)];
      },
      showPreloadingSettings: () => {
        console.log("🔧 Enabling preloading settings tab");
        if (window.kiteSettingsDebug?.enablePreloadingTab) {
          window.kiteSettingsDebug.enablePreloadingTab();
          console.log(
            "✅ Preloading settings tab enabled permanently. Open settings to see it.",
          );
          return "✅ Preloading tab enabled permanently. Open settings to see it.";
        }
        console.log(
          "❌ Settings component not available. Please refresh and try again.",
        );
        return "❌ Settings component not available. Please refresh and try again.";
      },
      hidePreloadingSettings: () => {
        console.log("🔧 Disabling preloading settings tab");
        if (window.kiteSettingsDebug?.disablePreloadingTab) {
          window.kiteSettingsDebug.disablePreloadingTab();
          console.log("✅ Preloading settings tab disabled.");
          return "✅ Preloading tab disabled.";
        }
        console.log(
          "❌ Settings component not available. Please refresh and try again.",
        );
        return "❌ Settings component not available. Please refresh and try again.";
      },
      resetOnboarding: () => {
        localStorage.removeItem("kite-onboarding-completed");
        localStorage.setItem("introShown", "false");
        console.log("✅ Onboarding reset. Refresh the page to see it again.");
        return "Onboarding reset. Refresh the page to see it again.";
      },
      showOnboarding: () => {
        showOnboarding = true;
        console.log("✅ Showing onboarding modal.");
        return "Showing onboarding modal.";
      },
    };
  }
</script>

<svelte:head>
  <!-- Preload search doggo icon to prevent flicker -->
  <link rel="preload" as="image" href={`${base}/doggo_default.svg`} />
</svelte:head>

{#if !dataLoaded}
  {@const urlParams = parseInitialUrl()}
  <DataLoader
    onDataLoaded={handleDataLoaded}
    onError={handleDataError}
    initialBatchId={urlParams.batchId}
    initialCategoryId={urlParams.categoryId}
  />
{:else if settings.showIntro}
  <IntroScreen visible={settings.showIntro} onClose={handleIntroClose} />
{:else}
  <!-- History Manager for URL state -->
  <HistoryManager
    bind:this={historyManager}
    batchId={currentBatchId}
    categoryId={currentCategory}
    storyIndex={currentStoryIndex}
    {isLatestBatch}
    onNavigate={handleUrlNavigation}
  />
  <!-- Sticky Header Container for Mobile (includes category nav when on top) -->
  <div
    class="md:hidden sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm relative"
  >
    <div class="container mx-auto max-w-[732px] px-4 pt-8 pb-2">
      <Header
        {offlineMode}
        {totalReadCount}
        {totalStoriesRead}
        {getLastUpdated}
        {chaosIndex}
        onSearchClick={() => (showSearchModal = true)}
      />
    </div>
    <!-- Category Navigation - Mobile when positioned at top -->
    {#if categoryHeaderPosition === "top"}
      <CategoryNavigation
        categories={orderedCategories}
        {currentCategory}
        onCategoryChange={handleCategoryChange}
        onCategoryDoubleClick={() => storyList?.toggleExpandAll()}
        mobilePosition="integrated"
        {temporaryCategory}
        showTemporaryTooltip={false}
      />
    {/if}
  </div>

  <!-- Category Navigation - Mobile when positioned at bottom -->
  {#if categoryHeaderPosition === "bottom"}
    <div class="md:hidden">
      <CategoryNavigation
        categories={orderedCategories}
        {currentCategory}
        onCategoryChange={handleCategoryChange}
        onCategoryDoubleClick={() => storyList?.toggleExpandAll()}
        mobilePosition="bottom"
        {temporaryCategory}
        showTemporaryTooltip={false}
      />
    </div>
  {/if}

  <!-- Main Content -->
  <main
    class="pb-[56px] md:pb-0 relative z-20 {categoryHeaderPosition === 'top'
      ? 'pt-0'
      : ''}"
    ontouchstart={categorySwipeHandler.handleTouchStart}
    ontouchmove={categorySwipeHandler.handleTouchMove}
    ontouchend={categorySwipeHandler.handleTouchEnd}
  >
    <div class="container mx-auto max-w-[732px] px-4 py-8">
      <!-- Desktop Header (non-sticky) -->
      <div class="hidden md:block">
        <Header
          {offlineMode}
          {totalReadCount}
          {totalStoriesRead}
          {getLastUpdated}
          {chaosIndex}
          onSearchClick={() => (showSearchModal = true)}
        />
      </div>

      <!-- Category Navigation - Desktop (normal document flow) -->
      <div class="hidden md:block">
        <CategoryNavigation
          bind:this={desktopCategoryNavigation}
          categories={orderedCategories}
          {currentCategory}
          onCategoryChange={handleCategoryChange}
          onCategoryDoubleClick={() => storyList?.toggleExpandAll()}
          mobilePosition="bottom"
          {temporaryCategory}
          showTemporaryTooltip={showTemporaryCategoryTooltip}
        />
      </div>

      <div>
        <!-- Shared Article Banner -->
        {#if isSharedArticleView}
          <div class="mb-4">
            <button
              onclick={handleExitSharedView}
              class="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {s("shared.viewAllArticles", {
                date: new Date(currentBatchCreatedAt || new Date())
                  .toLocaleDateString()
                  .toString(),
              })}
            </button>
          </div>
        {/if}

        <!-- News Content -->
        {#if currentCategory === "onthisday"}
          <OnThisDay
            stories={onThisDayEvents}
            onWikipediaClick={handleWikipediaClick}
          />
        {:else}
          <StoryList
            bind:this={storyList}
            {stories}
            {currentCategory}
            batchId={currentBatchId}
            bind:expandedStories
            onStoryToggle={handleStoryToggle}
            bind:readStories
            bind:showSourceOverlay
            bind:currentSource
            bind:sourceArticles
            bind:currentMediaInfo
            bind:isLoadingMediaInfo
            {storyCountOverride}
            isSharedView={isSharedArticleView}
            {sharedArticleIndex}
          />
        {/if}
      </div>

      <!-- Footer -->
      <Footer
        {currentCategory}
        onShowAbout={() => settings.setShowIntro(true)}
      />
    </div>
  </main>
{/if}

<!-- Settings Modal -->
<Settings
  visible={settings.isOpen}
  {categories}
  onClose={() => settings.close()}
  onShowAbout={() => {
    settings.close();
    settings.setShowIntro(true);
  }}
/>

<!-- Time Travel Modal -->
<TimeTravel />

<!-- Source Overlay -->
<SourceOverlay
  isOpen={showSourceOverlay}
  {currentSource}
  {sourceArticles}
  {currentMediaInfo}
  {isLoadingMediaInfo}
  onClose={handleCloseSource}
/>

<!-- Wikipedia Popup -->
<WikipediaPopup
  visible={wikipediaPopup.visible}
  title={wikipediaPopup.title}
  content={wikipediaPopup.content}
  imageUrl={wikipediaPopup.imageUrl}
  onClose={closeWikipediaPopup}
/>

<!-- Temporary Category Tooltip -->
<TemporaryCategoryTooltip
  show={showTemporaryCategoryTooltip}
  referenceElement={temporaryCategoryElement}
/>

<!-- Onboarding Modal - Disabled -->
<!-- <OnboardingModal
  visible={showOnboarding}
  {categories}
  onComplete={handleOnboardingComplete}
/>

<!-- Search Modal -->
<SearchModal
  visible={showSearchModal}
  {allCategoryStories}
  {categories}
  {currentCategory}
  onClose={() => (showSearchModal = false)}
  onSelectStory={handleSearchSelectStory}
/>

<!-- Back to Top Button -->
{#if dataLoaded && !showOnboarding && !settings.showIntro}
  <BackToTop />
{/if}
