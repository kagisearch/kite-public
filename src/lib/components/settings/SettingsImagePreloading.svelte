<script lang="ts">
import { imagePreloadingService } from '$lib/services/imagePreloadingService';
import { preloadingConfig } from '$lib/stores/preloadingConfig.svelte';

// Get current cache stats
let cacheStats = $state(imagePreloadingService.getCacheStats());

// Update cache stats periodically
let statsInterval: ReturnType<typeof setInterval>;
$effect(() => {
	statsInterval = setInterval(() => {
		cacheStats = imagePreloadingService.getCacheStats();
	}, 1000);

	return () => clearInterval(statsInterval);
});
</script>

<div class="space-y-4">
  <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
    Image Preloading (Debug)
  </h3>

  <!-- Enable/Disable Preloading -->
  <div class="flex items-center justify-between">
    <label
      for="preloading-enabled"
      class="text-sm text-gray-700 dark:text-gray-300"
    >
      Enable image preloading
    </label>
    <input
      id="preloading-enabled"
      type="checkbox"
      checked={preloadingConfig.enabled}
      onchange={(e) => preloadingConfig.setEnabled(e.currentTarget.checked)}
      class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  </div>

  <!-- Enable on Mobile -->
  <div class="flex items-center justify-between">
    <label
      for="preloading-mobile"
      class="text-sm text-gray-700 dark:text-gray-300"
    >
      Enable on mobile devices
      <span class="block text-xs text-gray-500 dark:text-gray-400">
        May increase data usage
      </span>
    </label>
    <input
      id="preloading-mobile"
      type="checkbox"
      checked={preloadingConfig.enableOnMobile}
      onchange={(e) =>
        preloadingConfig.setEnableOnMobile(e.currentTarget.checked)}
      class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  </div>

  <!-- Category Preload Delay -->
  <div class="space-y-2">
    <label
      for="category-delay"
      class="text-sm text-gray-700 dark:text-gray-300"
    >
      Category preload delay (ms)
    </label>
    <input
      id="category-delay"
      type="range"
      min="0"
      max="2000"
      step="100"
      value={preloadingConfig.categoryPreloadDelay}
      oninput={(e) =>
        preloadingConfig.setCategoryPreloadDelay(
          parseInt(e.currentTarget.value),
        )}
      class="w-full"
    />
    <div class="text-xs text-gray-500 dark:text-gray-400 text-end">
      {preloadingConfig.categoryPreloadDelay}ms
    </div>
  </div>

  <!-- Preload Timeout (Desktop only) -->
  <div class="space-y-2">
    <label
      for="preload-timeout"
      class="text-sm text-gray-700 dark:text-gray-300"
    >
      Desktop preload timeout (ms)
      <span class="block text-xs text-gray-500 dark:text-gray-400">
        Cancels slow downloads after this time
      </span>
    </label>
    <input
      id="preload-timeout"
      type="range"
      min="0"
      max="5000"
      step="500"
      value={preloadingConfig.preloadTimeout}
      oninput={(e) =>
        preloadingConfig.setPreloadTimeout(parseInt(e.currentTarget.value))}
      class="w-full"
    />
    <div class="text-xs text-gray-500 dark:text-gray-400 text-end">
      {preloadingConfig.preloadTimeout === 0
        ? "Disabled"
        : `${preloadingConfig.preloadTimeout}ms`}
    </div>
  </div>

  <!-- Cache Stats -->
  <div class="mt-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
      Cache Statistics
    </h4>
    <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
      <div class="flex justify-between">
        <span>Cached images:</span>
        <span class="font-mono">{cacheStats.cachedCount}</span>
      </div>
      <div class="flex justify-between">
        <span>Downloading:</span>
        <span class="font-mono">{cacheStats.downloadingCount}</span>
      </div>
      <div class="flex justify-between">
        <span>Active preloads:</span>
        <span class="font-mono">{cacheStats.downloadingCount || 0}</span>
      </div>
    </div>

    <!-- Clear Cache Button -->
    <button
      onclick={() => {
        imagePreloadingService.clearCache();
        cacheStats = imagePreloadingService.getCacheStats();
      }}
      class="mt-3 w-full px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Clear Image Cache
    </button>
  </div>

  <!-- Debug Mode -->
  <div class="flex items-center justify-between">
    <label for="debug-logging" class="text-sm text-gray-700 dark:text-gray-300">
      Enable debug logging
    </label>
    <input
      id="debug-logging"
      type="checkbox"
      checked={preloadingConfig.debugLogging}
      onchange={(e) =>
        preloadingConfig.setDebugLogging(e.currentTarget.checked)}
      class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  </div>
</div>
