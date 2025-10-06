<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import {
	type CategoryHeaderPosition,
	displaySettings,
	type FontSize,
	type MapsProvider,
	type StoryExpandMode,
	type StoryOpenMode,
	settings,
	themeSettings,
} from '$lib/data/settings.svelte.js';
import DataLanguageSelector from './snippets/DataLanguageSelector.svelte';
import LanguageSelector from './snippets/LanguageSelector.svelte';
import StoryCountSlider from './snippets/StoryCountSlider.svelte';
import ThemeSelector from './snippets/ThemeSelector.svelte';

// Props
interface Props {
	onShowAbout?: () => void;
}

let { onShowAbout }: Props = $props();

// Font size options for display
const fontSizeOptions = $derived([
	{ value: 'xs', label: s('settings.fontSize.xs') || 'Extra Small' },
	{ value: 'small', label: s('settings.fontSize.small') || 'Small' },
	{ value: 'normal', label: s('settings.fontSize.normal') || 'Normal' },
	{ value: 'large', label: s('settings.fontSize.large') || 'Large' },
	{ value: 'xl', label: s('settings.fontSize.xl') || 'Extra Large' },
]);

// Story expand mode options for display
const storyExpandModeOptions = $derived([
	{
		value: 'always',
		label: s('settings.storyExpandMode.always') || 'Always expand all',
	},
	{
		value: 'doubleClick',
		label: s('settings.storyExpandMode.doubleClick') || 'Double-click to expand all',
	},
	{
		value: 'never',
		label: s('settings.storyExpandMode.never') || 'Never expand all',
	},
]);

// Story open mode options for display
const storyOpenModeOptions = $derived([
	{
		value: 'multiple',
		label: s('settings.storyOpenMode.multiple') || 'Multiple stories',
	},
	{
		value: 'single',
		label: s('settings.storyOpenMode.single') || 'One story at a time',
	},
]);

// Maps provider options
const mapsProviderOptions = $derived([
	{
		value: 'auto',
		label: s('settings.mapsProvider.auto') || 'Auto',
	},
	{
		value: 'kagi',
		label: s('settings.mapsProvider.kagi') || 'Kagi Maps',
	},
	{
		value: 'google',
		label: s('settings.mapsProvider.google') || 'Google Maps',
	},
	{
		value: 'openstreetmap',
		label: s('settings.mapsProvider.openstreetmap') || 'OpenStreetMap',
	},
	{
		value: 'apple',
		label: s('settings.mapsProvider.apple') || 'Apple Maps',
	},
]);

// Local state that syncs with stores
let currentFontSize = $state(displaySettings.fontSize as string);
let currentCategoryHeaderPosition = $state(displaySettings.categoryHeaderPosition as string);
let currentStoryExpandMode = $state(displaySettings.storyExpandMode as string);
let currentStoryOpenMode = $state(displaySettings.storyOpenMode as string);
let currentUseLatestUrls = $state(displaySettings.useLatestUrls);
let currentMapsProvider = $state(displaySettings.mapsProvider as string);

// Sync local state with stores
$effect(() => {
	currentFontSize = displaySettings.fontSize as string;
});

$effect(() => {
	currentCategoryHeaderPosition = displaySettings.categoryHeaderPosition as string;
});

$effect(() => {
	currentStoryExpandMode = displaySettings.storyExpandMode as string;
});

$effect(() => {
	currentStoryOpenMode = displaySettings.storyOpenMode as string;
});

$effect(() => {
	currentUseLatestUrls = displaySettings.useLatestUrls;
});

$effect(() => {
	currentMapsProvider = displaySettings.mapsProvider as string;
});

// Font size change handler
function handleFontSizeChange(newSize: string) {
	displaySettings.fontSize = newSize as FontSize;
	settings.fontSize.save();
	currentFontSize = newSize;
}

// Category header position change handler
function handleCategoryHeaderPositionChange(position: string) {
	displaySettings.categoryHeaderPosition = position as CategoryHeaderPosition;
	settings.categoryHeaderPosition.save();
	currentCategoryHeaderPosition = position;
}

function handleStoryExpandModeChange(mode: string) {
	displaySettings.storyExpandMode = mode as StoryExpandMode;
	settings.storyExpandMode.save();
	currentStoryExpandMode = mode;
}

// Story open mode change handler
function handleStoryOpenModeChange(mode: string) {
	displaySettings.storyOpenMode = mode as StoryOpenMode;
	settings.storyOpenMode.save();
	currentStoryOpenMode = mode;
}

function handleUseLatestUrlsChange(value: string) {
	const enabled = value === 'enabled';
	displaySettings.useLatestUrls = enabled;
	settings.useLatestUrls.save();
	currentUseLatestUrls = enabled;
}

function handleMapsProviderChange(provider: string) {
	displaySettings.mapsProvider = provider as MapsProvider;
	settings.mapsProvider.save();
	currentMapsProvider = provider;
}

// Show about screen
function showAbout() {
	// Push /about to the URL
	window.history.pushState({}, '', '/about');
	if (onShowAbout) onShowAbout();
}
</script>

<div class="space-y-8">
  <!-- Appearance Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.appearance") || "Appearance"}
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
    </div>
  </div>

  <!-- Language & Region Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.localization") || "Language & Region"}
    </h3>
    <div class="space-y-4 ps-2">
      <!-- UI Language Setting -->
      <LanguageSelector showTooltip={true} showLoadingSpinner={true} />

      <!-- Data Language Setting -->
      <DataLanguageSelector
        showTooltip={true}
        showLoadingSpinner={true}
        showTranslateLink={true}
      />
    </div>
  </div>

  <!-- Reading Experience Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.readingExperience") || "Reading Experience"}
    </h3>
    <div class="space-y-4 ps-2">
      <!-- Story Count Setting -->
      <StoryCountSlider />

      <!-- Story Open Mode Setting -->
      <div class="flex flex-col space-y-2">
        <Select
          bind:value={currentStoryOpenMode}
          options={storyOpenModeOptions}
          label={s("settings.storyOpenMode.label") || "Story Open Mode"}
          onChange={handleStoryOpenModeChange}
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {s("settings.storyOpenMode.description") ||
            "Choose whether to allow multiple stories open at once or only one"}
        </p>
      </div>

      <!-- Story Expand Mode Setting -->
      <div class="flex flex-col space-y-2">
        <Select
          bind:value={currentStoryExpandMode}
          options={storyExpandModeOptions}
          label={s("settings.storyExpandMode.label") || "Story Expand Mode"}
          onChange={handleStoryExpandModeChange}
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {s("settings.storyExpandMode.description") ||
            "Choose how stories expand in a category"}
        </p>
      </div>

      <!-- Mobile-only category header position setting -->
      <div class="flex flex-col space-y-2 md:hidden">
        <Select
          bind:value={currentCategoryHeaderPosition}
          options={[
            {
              value: "bottom",
              label: s("settings.categoryHeaderPosition.bottom") || "Bottom",
            },
            {
              value: "top",
              label: s("settings.categoryHeaderPosition.top") || "Top",
            },
          ]}
          label={s("settings.categoryHeaderPosition.label") ||
            "Category Header Position"}
          onChange={handleCategoryHeaderPositionChange}
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {s("settings.categoryHeaderPosition.description") ||
            "Choose where category tabs appear on mobile devices"}
        </p>
      </div>
    </div>
  </div>

  <!-- Navigation Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.navigation") || "Navigation"}
    </h3>
    <div class="space-y-4 ps-2">
      <!-- Use Latest URLs Setting -->
      <div class="flex flex-col space-y-2">
        <Select
          value={currentUseLatestUrls ? "enabled" : "disabled"}
          options={[
            {
              value: "enabled",
              label: s("settings.useLatestUrls.enabled") || "Enabled",
            },
            {
              value: "disabled",
              label: s("settings.useLatestUrls.disabled") || "Disabled",
            },
          ]}
          label={s("settings.useLatestUrls.label") || "Use Latest URLs"}
          onChange={handleUseLatestUrlsChange}
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {s("settings.useLatestUrls.description") ||
            "Use /latest URLs for current news so bookmarks always show the latest content"}
        </p>
      </div>

      <!-- Maps Provider Setting -->
      <div class="flex flex-col space-y-2">
        <Select
          bind:value={currentMapsProvider}
          options={mapsProviderOptions}
          label={s("settings.mapsProvider.label") || "Maps Provider"}
          onChange={handleMapsProviderChange}
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {s("settings.mapsProvider.description") ||
            "Choose which maps service to use for location links"}
        </p>
      </div>
    </div>
  </div>

  <!-- About Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.about") || "About"}
    </h3>
    <div class="ps-2">
      <button
        onclick={showAbout}
        class="flex w-full items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        <img
          src={themeSettings.theme === "dark"
            ? "/svg/kagi_news_icon_dark.svg"
            : "/svg/kagi_news_icon.svg"}
          alt=""
          class="h-4 w-4"
        />
        <span>{s("settings.aboutKite.button") || "About Kite"}</span>
      </button>
    </div>
  </div>
</div>
