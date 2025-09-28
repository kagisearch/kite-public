<script lang="ts">
  import { s } from "$lib/client/localization.svelte";
  import { dataService, dataReloadService } from "$lib/services/dataService";
  import { imagePreloadingService } from "$lib/services/imagePreloadingService.js";
  import { categories as categoriesStore } from "$lib/stores/categories.svelte.js";
  import { dataLanguage } from "$lib/stores/dataLanguage.svelte.js";
  import { sections } from "$lib/stores/sections.svelte.js";
  import { timeTravel } from "$lib/stores/timeTravel.svelte.js";
  import { timeTravelBatch } from "$lib/stores/timeTravelBatch.svelte.js";
  import type { Category, Story } from "$lib/types";
  import { isMobileDevice } from "$lib/utils/device";
  import { formatTimeAgo } from "$lib/utils/formatTimeAgo";
  import SplashScreen from "./SplashScreen.svelte";
  import { onMount } from "svelte";
  import { getApiBaseUrl } from "$lib/utils/apiUrl";

  // Props
  interface Props {
    onDataLoaded?: (data: {
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
    }) => void;
    onError?: (error: string) => void;
    initialBatchId?: string | null;
    initialCategoryId?: string | null;
  }

  let { onDataLoaded, onError, initialBatchId, initialCategoryId }: Props =
    $props();

  // Loading state
  let initialLoading = $state(true);
  let loadingProgress = $state(0);
  let loadingStage = $state("");
  let hasError = $state(false);
  let errorMessage = $state("");

  // Data state
  let categories = $state<Category[]>([]);
  let stories = $state<Story[]>([]);
  let totalReadCount = $state(0);
  let lastUpdated = $state("");
  let currentCategory = $state("");
  let allCategoryStories = $state<Record<string, Story[]>>({});
  let isLatestBatch = $state(true);

  // Initialize loading stage
  $effect(() => {
    if (initialLoading && !loadingStage) {
      loadingStage = s("loading.initializing") || "Initializing...";
    }
  });

  // Function to preload all images for stories
  async function preloadCategoryImages(stories: Story[]) {
    await imagePreloadingService.preloadCategory(stories);
  }

  // Main data loading function
  async function loadInitialData() {
    try {
      loadingStage = "...";
      loadingProgress = 10;

      // Store batch info to avoid duplicate API calls
      let providedBatchInfo:
        | { id: string; createdAt: string; totalReadCount?: number }
        | undefined;

      // Check if we have a batch ID from URL
      if (initialBatchId) {
        // First, get the latest batch to compare
        const latestResponse = await fetch(
          `${getApiBaseUrl()}/batches/latest?lang=${dataLanguage.current}`,
        );
        if (latestResponse.ok) {
          const latestBatch = await latestResponse.json();

          // Only set time travel mode if this is NOT the latest batch
          if (initialBatchId !== latestBatch.id) {
            console.log(
              "🎯 Setting time travel mode for historical batch:",
              initialBatchId,
            );
            dataService.setTimeTravelBatch(initialBatchId);
            isLatestBatch = false;

            // Also set the time travel UI state so the banner shows
            // We need to get the batch info to set the correct date
            try {
              const batchResponse = await fetch(
                `${getApiBaseUrl()}/batches/${initialBatchId}`,
              );
              if (batchResponse.ok) {
                const batchData = await batchResponse.json();
                const batchDate = new Date(batchData.createdAt);
                console.log(
                  "🎯 Setting time travel UI state for date:",
                  batchDate,
                );
                timeTravel.selectDate(batchDate);
                timeTravel.selectBatch(initialBatchId);

                // Store the batch info to pass to batchService
                providedBatchInfo = {
                  id: batchData.id,
                  createdAt: batchData.createdAt,
                  totalReadCount: batchData.totalReadCount,
                };
              }
            } catch (error) {
              console.warn(
                "Failed to get batch info for time travel UI:",
                error,
              );
            }
          } else {
            console.log(
              "🎯 Batch from URL is the latest batch, not setting time travel mode",
            );
            isLatestBatch = true;
            // Store the latest batch info to avoid duplicate fetch
            providedBatchInfo = {
              id: latestBatch.id,
              createdAt: latestBatch.createdAt,
              totalReadCount: latestBatch.totalReadCount,
            };
          }
        }
      } else {
        // No batch ID in URL means we're viewing the latest
        isLatestBatch = true;
      }

      // Load initial data (batch info + categories) - pass batch info if we have it
      const initialData = await dataService.loadInitialData(
        dataLanguage.current,
        providedBatchInfo,
      );
      categories = initialData.categories;
      const {
        batchId,
        categoryMap,
        chaosIndex,
        chaosDescription,
        chaosLastUpdated,
      } = initialData;
      totalReadCount = initialData.totalReadCount;

      // Initialize categories store with loaded data
      categoriesStore.setAllCategories(categories);
      categoriesStore.init();
      categoriesStore.initWithDefaults();

      // Filter enabled categories to only those that exist in the current batch
      const availableCategoryIds = categories.map((cat) => cat.id);
      const validEnabledCategories = categoriesStore.enabled.filter((catId) =>
        availableCategoryIds.includes(catId),
      );

      // Update enabled categories to remove any that don't exist in current batch
      if (validEnabledCategories.length !== categoriesStore.enabled.length) {
        console.warn(
          "Some enabled categories are not available in current batch, updating enabled list",
        );
        categoriesStore.setEnabled(validEnabledCategories);
      }

      // Initialize sections store
      sections.init();

      loadingStage = s("loading.stories") || "Loading all category stories...";
      loadingProgress = 30;

      // Get all enabled categories except OnThisDay (case-insensitive) for loading
      // Use validEnabledCategories to ensure we only try to load existing categories
      const enabledCategoriesForLoading = validEnabledCategories.filter(
        (cat) => cat.toLowerCase() !== "onthisday",
      );

      // If we have a category from URL that's not enabled, we need to include it
      const categoriesToLoad = [...enabledCategoriesForLoading];
      let temporaryCategoryId: string | null = null;

      // Check against ALL enabled categories (including OnThisDay) to determine if it's temporary
      if (
        initialCategoryId &&
        !validEnabledCategories.includes(initialCategoryId)
      ) {
        // Check if this category exists in the available categories
        if (availableCategoryIds.includes(initialCategoryId)) {
          console.log(
            "Including non-enabled category from URL:",
            initialCategoryId,
          );
          categoriesToLoad.push(initialCategoryId);
          temporaryCategoryId = initialCategoryId;
          // Temporarily add to enabled categories so it shows in the navigation
          categoriesStore.addTemporary(initialCategoryId);
        }
      }

      // Use category from URL if provided, otherwise use first enabled
      const targetCategory =
        initialCategoryId || enabledCategoriesForLoading[0] || "World";
      currentCategory = targetCategory;

      // On mobile, only load the first category to save bandwidth and improve performance
      const isMobile = isMobileDevice();
      const categoriesToActuallyLoad = isMobile
        ? [targetCategory]
        : categoriesToLoad;

      if (isMobile) {
        console.log(
          `📱 Mobile device detected - loading only first category: ${targetCategory}`,
        );
      }

      // Load stories for categories (only first on mobile, all on desktop)
      const categoryPromises = categoriesToActuallyLoad.map(
        async (categoryId) => {
          try {
            const categoryUuid = categoryMap[categoryId];
            if (!categoryUuid) {
              console.warn(`Category UUID not found for ${categoryId}`);
              return {
                categoryId,
                stories: [],
                readCount: 0,
                timestamp: Date.now() / 1000,
              };
            }
            const result = await dataService.loadStories(
              batchId,
              categoryUuid,
              12,
              dataLanguage.current,
            );
            return {
              categoryId,
              stories: result.stories,
              readCount: result.readCount,
              timestamp: result.timestamp,
            };
          } catch (error) {
            console.warn(
              `Failed to load stories for category ${categoryId}:`,
              error,
            );
            return {
              categoryId,
              stories: [],
              readCount: 0,
              timestamp: Date.now() / 1000,
            };
          }
        },
      );

      const categoryResults = await Promise.all(categoryPromises);

      // Store all category stories
      allCategoryStories = {};
      let maxTimestamp = 0;
      let totalReadCountSum = 0;

      for (const result of categoryResults) {
        allCategoryStories[result.categoryId] = result.stories;
        maxTimestamp = Math.max(maxTimestamp, result.timestamp);
        totalReadCountSum += result.readCount;
      }

      // Set initial display to target category (from URL or first enabled)
      stories = allCategoryStories[targetCategory] || [];
      // Use batch totalReadCount if available, otherwise fall back to sum
      if (!totalReadCount || totalReadCount === 0) {
        totalReadCount = totalReadCountSum;
      }
      lastUpdated = formatTimeAgo(maxTimestamp, s);

      // Image preloading is now handled by the service which checks time travel mode internally
      loadingStage =
        s("loading.images") || "Preloading first category images...";
      loadingProgress = 50;

      // Only preload images for the first category to keep initial load fast
      const firstCategoryStories = allCategoryStories[targetCategory] || [];
      console.log(
        "📦 Preloading images for first category:",
        targetCategory,
        `(${firstCategoryStories.length} stories)`,
      );
      console.log(
        "📚 Total categories loaded:",
        Object.keys(allCategoryStories).length,
        `(${Object.values(allCategoryStories).flat().length} total stories)`,
      );

      if (firstCategoryStories.length > 0) {
        await preloadCategoryImages(firstCategoryStories);
      }

      loadingStage = s("loading.finishing") || "Finishing up...";
      loadingProgress = 90;

      await new Promise((resolve) => setTimeout(resolve, 100));

      loadingProgress = 100;
      loadingStage = s("loading.ready") || "Ready!";

      // Shorter wait before hiding splash screen
      setTimeout(() => {
        initialLoading = false;

        // Call the callback with loaded data
        if (onDataLoaded) {
          onDataLoaded({
            categories,
            stories,
            totalReadCount,
            lastUpdated,
            currentCategory,
            allCategoryStories, // Pass all preloaded stories
            categoryMap,
            batchId,
            batchCreatedAt: providedBatchInfo?.createdAt,
            chaosIndex,
            chaosDescription,
            chaosLastUpdated,
            isLatestBatch,
            temporaryCategory: temporaryCategoryId,
          });
        }
      }, 150);
    } catch (error) {
      console.error("Error loading initial data:", error);
      hasError = true;
      errorMessage =
        error instanceof Error ? error.message : "Failed to load data";
      loadingStage = s("loading.error") || "Error loading data";

      // Show error for a bit then continue with fallback
      setTimeout(() => {
        initialLoading = false;

        if (onError) {
          onError(errorMessage);
        }
      }, 2000);
    }
  }

  // Comprehensive reload function for language changes
  async function reloadAllData() {
    try {
      console.log(
        `🌍 reloadAllData called - Data language changed to ${dataLanguage.current}, reloading all data...`,
      );

      // Load initial data (batch info + categories)
      const initialData = await dataService.loadInitialData(
        dataLanguage.current,
      );
      categories = initialData.categories;
      const {
        batchId,
        batchCreatedAt,
        categoryMap,
        chaosIndex,
        chaosDescription,
        chaosLastUpdated,
      } = initialData;
      totalReadCount = initialData.totalReadCount;

      // Update categories store with new data
      categoriesStore.setAllCategories(categories);

      // Filter enabled categories to only those that exist in the current batch
      const availableCategoryIds = categories.map((cat) => cat.id);
      const validEnabledCategories = categoriesStore.enabled.filter((catId) =>
        availableCategoryIds.includes(catId),
      );

      // Update enabled categories to remove any that don't exist in current batch
      if (validEnabledCategories.length !== categoriesStore.enabled.length) {
        console.warn(
          "Some enabled categories are not available in current batch, updating enabled list",
        );
        categoriesStore.setEnabled(validEnabledCategories);
      }

      // Get all enabled categories except OnThisDay (case-insensitive) for loading
      const enabledCategoriesForLoading = validEnabledCategories.filter(
        (cat) => cat.toLowerCase() !== "onthisday",
      );

      // If we have a category from URL that's not enabled, we need to include it
      const categoriesToLoad = [...enabledCategoriesForLoading];
      let temporaryCategoryId: string | null = null;

      // Check against ALL enabled categories (including OnThisDay) to determine if it's temporary
      if (
        initialCategoryId &&
        !validEnabledCategories.includes(initialCategoryId)
      ) {
        // Check if this category exists in the available categories
        if (availableCategoryIds.includes(initialCategoryId)) {
          console.log(
            "Including non-enabled category from URL (latest batch):",
            initialCategoryId,
          );
          categoriesToLoad.push(initialCategoryId);
          temporaryCategoryId = initialCategoryId;
          // Temporarily add to enabled categories so it shows in the navigation
          categoriesStore.addTemporary(initialCategoryId);
        }
      }

      const firstEnabledCategory =
        initialCategoryId || enabledCategoriesForLoading[0] || "World";
      currentCategory = firstEnabledCategory;

      // On mobile, only load the first category to save bandwidth and improve performance
      const isMobile = isMobileDevice();
      const categoriesToActuallyLoad = isMobile
        ? [firstEnabledCategory]
        : categoriesToLoad;

      if (isMobile) {
        console.log(
          `📱 Mobile device detected during reload - loading only first category: ${firstEnabledCategory}`,
        );
      }

      // Load stories for categories (only first on mobile, all on desktop)
      const categoryPromises = categoriesToActuallyLoad.map(
        async (categoryId) => {
          try {
            const categoryUuid = categoryMap[categoryId];
            if (!categoryUuid) {
              console.warn(`Category UUID not found for ${categoryId}`);
              return {
                categoryId,
                stories: [],
                readCount: 0,
                timestamp: Date.now() / 1000,
              };
            }
            const result = await dataService.loadStories(
              batchId,
              categoryUuid,
              12,
              dataLanguage.current,
            );
            return {
              categoryId,
              stories: result.stories,
              readCount: result.readCount,
              timestamp: result.timestamp,
            };
          } catch (error) {
            console.warn(
              `Failed to load stories for category ${categoryId}:`,
              error,
            );
            return {
              categoryId,
              stories: [],
              readCount: 0,
              timestamp: Date.now() / 1000,
            };
          }
        },
      );

      const categoryResults = await Promise.all(categoryPromises);

      // Store all category stories
      allCategoryStories = {};
      let maxTimestamp = 0;
      let totalReadCountSum = 0;

      for (const result of categoryResults) {
        allCategoryStories[result.categoryId] = result.stories;
        maxTimestamp = Math.max(maxTimestamp, result.timestamp);
        totalReadCountSum += result.readCount;
      }

      // Set initial display to current category (from URL or first enabled)
      stories = allCategoryStories[currentCategory] || [];
      // Use batch totalReadCount if available, otherwise fall back to sum
      if (!totalReadCount || totalReadCount === 0) {
        totalReadCount = totalReadCountSum;
      }
      lastUpdated = formatTimeAgo(maxTimestamp, s);

      // Preload images for the current category
      const firstCategoryStories = allCategoryStories[currentCategory] || [];
      if (firstCategoryStories.length > 0) {
        await preloadCategoryImages(firstCategoryStories);
      }

      console.log(
        `✅ Language reload complete: ${enabledCategoriesForLoading.length} categories, ${Object.values(allCategoryStories).flat().length} total stories`,
      );

      // Notify parent component with updated data
      if (onDataLoaded) {
        onDataLoaded({
          categories,
          stories,
          totalReadCount,
          lastUpdated,
          currentCategory,
          allCategoryStories,
          categoryMap,
          batchId,
          batchCreatedAt,
          chaosIndex,
          chaosDescription,
          chaosLastUpdated,
          isLatestBatch,
          temporaryCategory: temporaryCategoryId,
        });
      }
    } catch (error) {
      console.error("Error reloading data for language change:", error);

      if (onError) {
        onError(
          error instanceof Error ? error.message : "Failed to reload data",
        );
      }
    }
  }

  // Load data when component mounts
  onMount(() => {
    console.log("🚀 DataLoader mounted - loading initial data");
    loadInitialData();

    // Register reload callback
    dataReloadService.onReload(reloadAllData);
  });

  // Watch for batch changes (time travel mode toggle)
  let previousBatchId: string | null = null;
  $effect(() => {
    const currentBatchId = timeTravelBatch.batchId;

    // If batch changed and we're not in initial loading
    if (
      currentBatchId !== previousBatchId &&
      !initialLoading &&
      previousBatchId !== null
    ) {
      console.log(
        `🔄 Batch changed from ${previousBatchId} to ${currentBatchId}, reloading data...`,
      );
      previousBatchId = currentBatchId;

      // Update isLatestBatch based on whether we're clearing time travel mode
      isLatestBatch = currentBatchId === null;

      // Show loading screen briefly
      initialLoading = true;
      loadingProgress = 0;
      loadingStage = s("loading.loadingData") || "Loading news data...";

      // Load new data
      setTimeout(() => {
        loadInitialData();
      }, 100);
    } else {
      previousBatchId = currentBatchId;
    }
  });
</script>

{#if initialLoading}
  <SplashScreen
    showProgress={loadingProgress > 5}
    progress={loadingProgress}
    stage={loadingStage}
    {hasError}
    {errorMessage}
  />
{/if}
