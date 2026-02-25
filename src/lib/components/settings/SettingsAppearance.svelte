<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import {
	displaySettings,
	type FontSize,
	type LayoutWidth,
	settings,
} from '$lib/data/settings.svelte.js';
import { experimental } from '$lib/stores/experimental.svelte.js';
import ThemeSelector from './snippets/ThemeSelector.svelte';

// Font size options for display
const fontSizeOptions = $derived([
	{ value: 'xs', label: s('settings.fontSize.xs') || 'Extra Small' },
	{ value: 'small', label: s('settings.fontSize.small') || 'Small' },
	{ value: 'normal', label: s('settings.fontSize.normal') || 'Normal' },
	{ value: 'large', label: s('settings.fontSize.large') || 'Large' },
	{ value: 'xl', label: s('settings.fontSize.xl') || 'Extra Large' },
]);

// Layout width options
const layoutWidthOptions = $derived([
	{
		value: 'normal',
		label: s('settings.layoutWidth.normal') || 'Normal (732px)',
	},
	{
		value: 'wide',
		label: s('settings.layoutWidth.wide') || 'Wide (1024px)',
	},
	{
		value: 'full',
		label: s('settings.layoutWidth.full') || 'Full Width',
	},
]);

// Local state that syncs with stores
let currentFontSize = $state(displaySettings.fontSize as string);
let currentLayoutWidth = $state(displaySettings.layoutWidth as string);

// Sync local state with stores
$effect(() => {
	currentFontSize = displaySettings.fontSize as string;
});

$effect(() => {
	currentLayoutWidth = displaySettings.layoutWidth as string;
});

// Font size change handler
function handleFontSizeChange(newSize: string) {
	displaySettings.fontSize = newSize as FontSize;
	settings.fontSize.save();
	currentFontSize = newSize;
}

function handleLayoutWidthChange(width: string) {
	displaySettings.layoutWidth = width as LayoutWidth;
	settings.layoutWidth.save();
	currentLayoutWidth = width;
}

// Toggle handlers for experimental features
function toggleArticleIcons() {
	experimental.toggleFeature('showArticleIcons');
}

function toggleCategoryIcons() {
	experimental.toggleFeature('showCategoryIcons');
}

function toggleChaosIndex() {
	experimental.toggleFeature('showChaosIndex');
}
</script>

<div class="space-y-8">
  <!-- Theme & Display Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.display") || "Display"}
    </h3>
    <div class="space-y-4 ps-2">
      <!-- Theme Setting -->
      <ThemeSelector />

      <!-- Font Size Setting -->
      <div class="flex flex-col space-y-2">
        <Select
          bind:value={currentFontSize}
          options={fontSizeOptions}
          label={s("settings.fontSize.label") || "Text Size"}
          onChange={handleFontSizeChange}
        />
      </div>

      <!-- Layout Width Setting (desktop only) -->
      <div class="hidden md:flex flex-col space-y-2">
        <Select
          bind:value={currentLayoutWidth}
          options={layoutWidthOptions}
          label={s("settings.layoutWidth.label") || "Layout Width"}
          onChange={handleLayoutWidthChange}
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {s("settings.layoutWidth.description") ||
            "Choose how wide the content area should be on larger screens"}
        </p>
      </div>
    </div>
  </div>

  <!-- Visual Enhancements Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.visualEnhancements") || "Visual Enhancements"}
    </h3>
    <div class="space-y-3 ps-2">
      <!-- Article Icons -->
      <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div class="flex-1 pe-4">
          <label
            for="show-article-icons"
            id="label-article-icons"
            class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {s("settings.experimental.articleIcons.label") || "Show Article Icons"}
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {s("settings.experimental.articleIcons.description") ||
              "Display emoji icons next to article titles to provide visual context."}
          </p>
        </div>
        <button
          id="show-article-icons"
          onclick={toggleArticleIcons}
          type="button"
          class="focus-visible-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
          class:bg-blue-600={experimental.showArticleIcons}
          class:bg-gray-200={!experimental.showArticleIcons}
          class:dark:bg-gray-600={!experimental.showArticleIcons}
          role="switch"
          aria-checked={experimental.showArticleIcons}
          aria-labelledby="label-article-icons"
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

      <!-- Category Icons -->
      <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div class="flex-1 pe-4">
          <label
            for="show-category-icons"
            id="label-category-icons"
            class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {s("settings.experimental.categoryIcons.label") || "Show Category Icons"}
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {s("settings.experimental.categoryIcons.description") ||
              "Display icons next to category labels for better visual identification."}
          </p>
        </div>
        <button
          id="show-category-icons"
          onclick={toggleCategoryIcons}
          type="button"
          class="focus-visible-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
          class:bg-blue-600={experimental.showCategoryIcons}
          class:bg-gray-200={!experimental.showCategoryIcons}
          class:dark:bg-gray-600={!experimental.showCategoryIcons}
          role="switch"
          aria-checked={experimental.showCategoryIcons}
          aria-labelledby="label-category-icons"
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

      <!-- World Tension Index -->
      <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div class="flex-1 pe-4">
          <label
            for="show-chaos-index"
            id="label-chaos-index"
            class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {s("settings.experimental.chaosIndex.label") || "Show World Tension Index"}
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {s("settings.experimental.chaosIndex.description") ||
              "Display a global temperature reading of world stability based on current events."}
          </p>
        </div>
        <button
          id="show-chaos-index"
          onclick={toggleChaosIndex}
          type="button"
          class="focus-visible-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
          class:bg-blue-600={experimental.showChaosIndex}
          class:bg-gray-200={!experimental.showChaosIndex}
          class:dark:bg-gray-600={!experimental.showChaosIndex}
          role="switch"
          aria-checked={experimental.showChaosIndex}
          aria-labelledby="label-chaos-index"
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
    </div>
  </div>
</div>
