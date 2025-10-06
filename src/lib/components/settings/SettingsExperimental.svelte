<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { experimental } from '$lib/stores/experimental.svelte.js';

// Toggle handlers
function toggleArticleIcons() {
	experimental.toggleFeature('showArticleIcons');
}

function toggleCategoryIcons() {
	experimental.toggleFeature('showCategoryIcons');
}

function toggleDisableCategorySwipe() {
	experimental.toggleFeature('disableCategorySwipe');
}

function toggleChaosIndex() {
	experimental.toggleFeature('showChaosIndex');
}
</script>

<div class="space-y-6">
  <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
    ⚠️ <span class="ms-1"
      >{s("settings.experimental.warning") ||
        "These features are experimental and may change or be removed in future versions."}</span
    >
  </p>

  <!-- Article Icons -->
  <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <div class="mb-2 flex items-center justify-between">
      <label
        for="show-article-icons"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {s("settings.experimental.articleIcons.label") || "Show Article Icons"}
      </label>
      <button
        id="show-article-icons"
        onclick={toggleArticleIcons}
        type="button"
        class="focus-visible-ring relative inline-flex h-6 w-11 items-center rounded-full transition"
        class:bg-blue-600={experimental.showArticleIcons}
        class:bg-gray-200={!experimental.showArticleIcons}
        class:dark:bg-gray-600={!experimental.showArticleIcons}
        role="switch"
        aria-checked={experimental.showArticleIcons}
      >
        <span class="sr-only"
          >{s("settings.experimental.articleIcons.label") ||
            "Show Article Icons"}</span
        >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition"
          class:ltr:translate-x-6={experimental.showArticleIcons}
          class:rtl:-translate-x-6={experimental.showArticleIcons}
          class:ltr:translate-x-1={!experimental.showArticleIcons}
          class:rtl:-translate-x-1={!experimental.showArticleIcons}
        ></span>
      </button>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      {s("settings.experimental.articleIcons.description") ||
        "Display emoji icons next to article titles to provide visual context."}
    </p>
  </div>

  <!-- Category Icons -->
  <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <div class="mb-2 flex items-center justify-between">
      <label
        for="show-category-icons"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {s("settings.experimental.categoryIcons.label") ||
          "Show Category Icons"}
      </label>
      <button
        id="show-category-icons"
        onclick={toggleCategoryIcons}
        type="button"
        class="focus-visible-ring relative inline-flex h-6 w-11 items-center rounded-full transition"
        class:bg-blue-600={experimental.showCategoryIcons}
        class:bg-gray-200={!experimental.showCategoryIcons}
        class:dark:bg-gray-600={!experimental.showCategoryIcons}
        role="switch"
        aria-checked={experimental.showCategoryIcons}
      >
        <span class="sr-only"
          >{s("settings.experimental.categoryIcons.label") ||
            "Show Category Icons"}</span
        >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition"
          class:ltr:translate-x-6={experimental.showCategoryIcons}
          class:rtl:-translate-x-6={experimental.showCategoryIcons}
          class:ltr:translate-x-1={!experimental.showCategoryIcons}
          class:rtl:-translate-x-1={!experimental.showCategoryIcons}
        ></span>
      </button>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      {s("settings.experimental.categoryIcons.description") ||
        "Display icons next to category labels for better visual identification."}
    </p>
  </div>

  <!-- Disable Category Swipe -->
  <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <div class="mb-2 flex items-center justify-between">
      <label
        for="disable-category-swipe"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {s("settings.experimental.disableCategorySwipe.label") ||
          "Disable horizontal category swiping"}
      </label>
      <button
        id="disable-category-swipe"
        onclick={toggleDisableCategorySwipe}
        type="button"
        class="focus-visible-ring relative inline-flex h-6 w-11 items-center rounded-full transition"
        class:bg-blue-600={experimental.disableCategorySwipe}
        class:bg-gray-200={!experimental.disableCategorySwipe}
        class:dark:bg-gray-600={!experimental.disableCategorySwipe}
        role="switch"
        aria-checked={experimental.disableCategorySwipe}
      >
        <span class="sr-only"
          >{s("settings.experimental.disableCategorySwipe.label") ||
            "Disable horizontal category swiping"}</span
        >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition"
          class:ltr:translate-x-6={experimental.disableCategorySwipe}
          class:rtl:-translate-x-6={experimental.disableCategorySwipe}
          class:ltr:translate-x-1={!experimental.disableCategorySwipe}
          class:rtl:-translate-x-1={!experimental.disableCategorySwipe}
        ></span>
      </button>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      {s("settings.experimental.disableCategorySwipe.description") ||
        "When enabled, horizontal swiping to change categories on mobile devices will be disabled."}
    </p>
  </div>

  <!-- Chaos Index -->
  <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <div class="mb-2 flex items-center justify-between">
      <label
        for="show-chaos-index"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {s("settings.experimental.chaosIndex.label") ||
          "Show World Tension Index"}
      </label>
      <button
        id="show-chaos-index"
        onclick={toggleChaosIndex}
        type="button"
        class="focus-visible-ring relative inline-flex h-6 w-11 items-center rounded-full transition"
        class:bg-blue-600={experimental.showChaosIndex}
        class:bg-gray-200={!experimental.showChaosIndex}
        class:dark:bg-gray-600={!experimental.showChaosIndex}
        role="switch"
        aria-checked={experimental.showChaosIndex}
      >
        <span class="sr-only"
          >{s("settings.experimental.chaosIndex.label") ||
            "Show World Tension Index"}</span
        >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition"
          class:ltr:translate-x-6={experimental.showChaosIndex}
          class:rtl:-translate-x-6={experimental.showChaosIndex}
          class:ltr:translate-x-1={!experimental.showChaosIndex}
          class:rtl:-translate-x-1={!experimental.showChaosIndex}
        ></span>
      </button>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      {s("settings.experimental.chaosIndex.description") ||
        "Display a global temperature reading of world stability based on current events."}
    </p>
  </div>
</div>
