<script lang="ts">
import { IconX } from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';
import FaviconImage from '$lib/components/common/FaviconImage.svelte';
import Select from '$lib/components/Select.svelte';
import {
	displaySettings,
	type MapsProvider,
	type StoryExpandMode,
	type StoryOpenMode,
	settings,
} from '$lib/data/settings.svelte.js';
import { preferredSources } from '$lib/stores/preferredSources.svelte.js';
import SectionsList from './snippets/SectionsList.svelte';
import StoryCountSlider from './snippets/StoryCountSlider.svelte';

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

// Local state for story settings
let currentStoryExpandMode = $state(displaySettings.storyExpandMode as string);
let currentStoryOpenMode = $state(displaySettings.storyOpenMode as string);
let currentMapsProvider = $state(displaySettings.mapsProvider as string);

// Sync local state with stores
$effect(() => {
	currentStoryExpandMode = displaySettings.storyExpandMode as string;
});

$effect(() => {
	currentStoryOpenMode = displaySettings.storyOpenMode as string;
});

$effect(() => {
	currentMapsProvider = displaySettings.mapsProvider as string;
});

function handleStoryExpandModeChange(mode: string) {
	displaySettings.storyExpandMode = mode as StoryExpandMode;
	settings.storyExpandMode.save();
	currentStoryExpandMode = mode;
}

function handleStoryOpenModeChange(mode: string) {
	displaySettings.storyOpenMode = mode as StoryOpenMode;
	settings.storyOpenMode.save();
	currentStoryOpenMode = mode;
}

function handleMapsProviderChange(provider: string) {
	displaySettings.mapsProvider = provider as MapsProvider;
	settings.mapsProvider.save();
	currentMapsProvider = provider;
}

// --- Pinned Sources State ---
let showSourcesClearConfirmation = $state(false);

function handleClearSources() {
	preferredSources.clear();
	showSourcesClearConfirmation = true;
	setTimeout(() => {
		showSourcesClearConfirmation = false;
	}, 1000);
}

function handleRemoveSource(domain: string) {
	preferredSources.removePreferred(domain);
}
</script>

<div class="space-y-8">
  <!-- Story Display Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.subsections.storyDisplay") || "Story Display"}
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

  <!-- Article Sections - using shared component -->
  <SectionsList />

  <!-- Pinned Sources Section -->
  <div class="space-y-4">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.preferredSources.title") || "Pinned Sources"}
    </h3>
    <div class="ps-2">
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {s("settings.preferredSources.description") ||
          "Pinned sources appear first in each story's source list. Click the pin icon on any source to add it here."}
      </p>

      {#if preferredSources.list.length === 0}
        <div class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          {s("settings.preferredSources.empty") ||
            "No pinned sources yet. Open a story, click on a source, and use the pin icon to add it here."}
        </div>
      {:else}
        <div class="space-y-2">
          {#each preferredSources.list as domain}
            <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
              <div class="flex items-center space-x-3">
                <FaviconImage
                  domain={domain}
                  alt="{domain} favicon"
                  class="h-5 w-5 rounded-sm"
                />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {domain}
                </span>
              </div>
              <button
                onclick={() => handleRemoveSource(domain)}
                class="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 focus-visible-ring rounded p-1"
                aria-label={s("settings.preferredSources.remove") || `Remove ${domain} from pinned sources`}
              >
                <IconX class="h-4 w-4" />
              </button>
            </div>
          {/each}
        </div>

        <div class="text-center mt-4">
          {#if showSourcesClearConfirmation}
            <span class="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                class="inline-block"
              >
                <path
                  d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                />
              </svg>
              {s("settings.preferredSources.cleared") || "Cleared!"}
            </span>
          {:else}
            <button
              onclick={handleClearSources}
              class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 focus-visible-ring rounded"
            >
              {s("settings.preferredSources.clearAll") || "Clear all pinned sources"}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
