<script lang="ts">
import { IconInfoCircle } from '@tabler/icons-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import { SUPPORTED_LANGUAGES } from '$lib/constants/languages.js';
import { languageSettings, type SupportedLanguage, settings } from '$lib/data/settings.svelte.js';
import { dataReloadService } from '$lib/services/dataService.js';
import { detectUserLanguage } from '$lib/utils/languageDetection.js';

// Props
interface Props {
	showTooltip?: boolean;
	showLoadingSpinner?: boolean;
	showTranslateLink?: boolean;
}

let {
	showTooltip = false,
	showLoadingSpinner = false,
	showTranslateLink = false,
}: Props = $props();

// Data Language options - include "default" and "source" options
const dataLanguageOptions = $derived(
	SUPPORTED_LANGUAGES.map((lang) => ({
		value: lang.code,
		label:
			lang.code === 'default'
				? s('settings.language.default') || 'Default'
				: lang.code === 'source'
					? s('settings.language.source') || 'Source'
					: lang.name,
	})),
);

// Loading state
let isLoading = $state(false);

// Get the browser's detected language name for the tooltip
const browserLanguageName = $derived.by(() => {
	if (!browser) return 'English';

	const detectedLangCode = detectUserLanguage();
	const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === detectedLangCode);

	if (!langInfo) return 'English';

	// Extract English name from parentheses if present
	const match = langInfo.name.match(/\(([^)]+)\)/);
	if (match) {
		return match[1];
	}

	// For languages without parentheses, return as-is
	return langInfo.name;
});

// Handle data language change
async function handleDataLanguageChange(newLanguage: string) {
	languageSettings.data = newLanguage as SupportedLanguage;
	settings.dataLanguage.save();

	if (showLoadingSpinner) {
		isLoading = true;
		try {
			// Reload all data for the new data language
			await dataReloadService.reloadData();
		} finally {
			isLoading = false;
		}
	}
}
</script>

<div class="space-y-2">
  {#if showTooltip}
    <div class="flex items-center space-x-1 mb-1">
      <label
        for="data-language-select"
        class="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {s("settings.dataLanguage.label") || "Content Language"}
      </label>
      <Tooltip
        text={s("settings.dataLanguage.tooltip", { browserLang: browserLanguageName }) ||
          `Default shows most categories in your browser's language (${browserLanguageName}), but country categories in their local language. Select a specific language to view all content in that language.`}
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
      id={showTooltip ? "data-language-select" : undefined}
      value={languageSettings.data as string}
      options={dataLanguageOptions}
      label={!showTooltip
        ? s("settings.dataLanguage.label") || "Content Language"
        : undefined}
      hideLabel={showTooltip}
      onChange={handleDataLanguageChange}
    />
    {#if showLoadingSpinner && isLoading}
      <div class="absolute right-3 top-2.5">
        <div
          class="animate-spin h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"
        ></div>
      </div>
    {/if}
  </div>

  {#if showTranslateLink}
    <div
      class="mt-1 flex items-center justify-end text-xs text-gray-500 dark:text-gray-400"
    >
      <a
        href="https://kagi.com/translate"
        target="_blank"
        class="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
      >
        <span
          >{s("settings.language.poweredBy") ||
            "Translated with Kagi Translate"}</span
        >
        <img
          src="/svg/translate.svg"
          alt="Kagi Translate"
          class="ms-1 h-3 w-3"
        />
      </a>
    </div>
  {/if}
</div>
