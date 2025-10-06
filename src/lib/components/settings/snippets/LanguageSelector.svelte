<script lang="ts">
import { IconInfoCircle } from '@tabler/icons-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { preloadAllLocales } from '$lib/client/storyLocalization.svelte';
import Select from '$lib/components/Select.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import { SUPPORTED_LANGUAGES } from '$lib/constants/languages.js';
import { languageSettings, type SupportedLanguage, settings } from '$lib/data/settings.svelte.js';
import { detectUserLanguage } from '$lib/utils/languageDetection.js';

// Props
interface Props {
	showTooltip?: boolean;
	showLoadingSpinner?: boolean;
}

let { showTooltip = false, showLoadingSpinner = false }: Props = $props();

// Language options - include "default" for browser language detection
const languageOptions = $derived(
	SUPPORTED_LANGUAGES.map((lang) => ({
		value: lang.code,
		label:
			lang.code === 'default'
				? s('settings.language.default') || 'Default (Auto-detect)'
				: lang.name,
	})),
);

// Loading state
let isLoading = $state(false);

// Get browser language name for tooltip
const browserLanguageName = $derived.by(() => {
	if (!browser) return 'English';

	// Use the existing detection logic to get the language code
	const detectedLangCode = detectUserLanguage();

	// If it returns "default", browser language is not supported
	if (detectedLangCode === 'default') {
		return navigator.language; // Show the raw browser language code
	}

	// Find the language info for the detected code
	const langInfo = SUPPORTED_LANGUAGES.find((lang) => lang.code === detectedLangCode);
	if (!langInfo) return 'English';

	// Extract the English name from parentheses if it exists
	const match = langInfo.name.match(/\(([^)]+)\)/);
	if (match) {
		// Return just the English part (e.g., "Simplified Chinese" instead of "简体中文 (Simplified Chinese)")
		return match[1];
	}

	// For languages without parentheses (like English, Spanish), return as-is
	return langInfo.name;
});

// Handle language change
async function handleLanguageChange(newLanguage: string) {
	languageSettings.ui = newLanguage as SupportedLanguage;
	settings.language.save();

	// If switching to "default", preload all locales
	if (newLanguage === 'default') {
		await preloadAllLocales();
	}

	if (showLoadingSpinner) {
		isLoading = true;
		// UI language change only requires locale reload
		await new Promise((resolve) => setTimeout(resolve, 500));
		isLoading = false;
	}
}
</script>

<div class="space-y-2">
  {#if showTooltip}
    <div class="flex items-center space-x-1 mb-1">
      <label
        for="ui-language-select"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {s("settings.uiLanguage.label") || "Interface Language"}
      </label>
      <Tooltip
        text={s("settings.uiLanguage.tooltip", { language: browserLanguageName }) ||
          `Controls the language of buttons, menus, and interface text. Default sets the UI language to your browser's language (${browserLanguageName}) automatically, but the headings inside a story to the language of that story.`}
        position="bottom"
      >
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <IconInfoCircle size={14} stroke={1.5} />
        </button>
      </Tooltip>
    </div>
  {/if}

  <div class="relative">
    <Select
      id={showTooltip ? "ui-language-select" : undefined}
      value={languageSettings.ui as string}
      options={languageOptions}
      label={!showTooltip
        ? s("settings.uiLanguage.label") || "Interface Language"
        : undefined}
      hideLabel={showTooltip}
      onChange={handleLanguageChange}
    />
    {#if showLoadingSpinner && isLoading}
      <div class="absolute right-3 top-2.5">
        <div
          class="animate-spin h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"
        ></div>
      </div>
    {/if}
  </div>
</div>
