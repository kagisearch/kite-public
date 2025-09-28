export {};

declare global {
  interface Window {
    kiteSettingsDebug?: {
      enablePreloadingTab?: () => void;
      disablePreloadingTab?: () => void;
    };
    kiteDebug: {
      getCacheStats: () => unknown;
      clearCache: () => void;
      preloadCurrentCategory: () => void;
      getCurrentStories: () => unknown[];
      getCurrentCategory: () => string;
      getAllCategoryStories: () => Record<string, unknown[]>;
      getPreloadedCategories: () => string[];
      getImageUrls: () => string[];
      getAllImageUrls: () => string[];
      showPreloadingSettings: () => string;
      hidePreloadingSettings: () => string;
      resetOnboarding: () => string;
      showOnboarding: () => string;
    };
  }
}

