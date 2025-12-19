<script lang="ts">
import { IconInfoCircle, IconX } from '@tabler/icons-svelte';
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

// Data Language options - only show default, source, and custom
const dataLanguageOptions = $derived([
	{
		value: 'default',
		label: s('settings.language.default') || 'Default',
	},
	{
		value: 'source',
		label: s('settings.language.source') || 'Source',
	},
	{
		value: 'custom',
		label: s('settings.language.custom') || 'Custom',
	},
]);

// Available languages for custom preferences (exclude special values)
const availableLanguages = $derived(
	SUPPORTED_LANGUAGES.filter(
		(lang) => lang.code !== 'default' && lang.code !== 'source' && lang.code !== 'custom',
	).map((lang) => ({
		value: lang.code,
		label: lang.name,
	})),
);

// Show custom language preferences UI when custom is selected
const showCustomPreferences = $derived(languageSettings.data === 'custom');

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

// Language preferences management
function addLanguagePreference(langCode: string) {
	const currentPrefs = languageSettings.contentLanguages;
	if (!currentPrefs.includes(langCode as SupportedLanguage)) {
		languageSettings.contentLanguages = [...currentPrefs, langCode as SupportedLanguage];
		triggerReloadIfNeeded();
	}
}

function removeLanguagePreference(langCode: string) {
	const currentPrefs = languageSettings.contentLanguages;
	languageSettings.contentLanguages = currentPrefs.filter((lang) => lang !== langCode);
	triggerReloadIfNeeded();
}

async function triggerReloadIfNeeded() {
	if (showLoadingSpinner) {
		isLoading = true;
		try {
			await dataReloadService.reloadData();
		} finally {
			isLoading = false;
		}
	}
}

// Get languages not yet in "languages I speak" (exclude main language and already added ones)
const availableToAdd = $derived(
	availableLanguages.filter(
		(lang) => !languageSettings.contentLanguages.includes(lang.value as SupportedLanguage),
	),
);

// Track selected language for adding
let selectedLanguageToAdd = $state<string>('');
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

  {#if showCustomPreferences}
    <div class="mt-4 space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
      <div class="space-y-3">
        <div>
          <Select
            label={s("settings.language.mainLanguage") || "Main Language"}
            value={languageSettings.contentLanguages[0] || 'en'}
            options={availableLanguages}
            onChange={(value: string) => {
              const current = languageSettings.contentLanguages;
              const newMainLanguage = value as SupportedLanguage;
              const oldMainLanguage = current[0];

              // Check if the new main language is already in the list
              const existingIndex = current.indexOf(newMainLanguage);

              if (existingIndex > 0) {
                // Swap: new main language becomes first, old main language takes its place
                const updated = [...current];
                updated[0] = newMainLanguage;
                updated[existingIndex] = oldMainLanguage;
                languageSettings.contentLanguages = updated;
              } else {
                // New language not in list, just replace the main language
                languageSettings.contentLanguages = [newMainLanguage, ...current.slice(1)];
              }

              triggerReloadIfNeeded();
            }}
            className="w-full"
            height="h-10"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {s("settings.language.mainLanguageHelp") || "Articles will be translated into this language when not in a language you speak."}
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {s("settings.language.languagesISpeak") || "Languages I Speak"}
            </h4>
            <Tooltip
              text={s("settings.language.languagesISpeakTooltip") || "Select all languages you can read. Articles in these languages will be shown in their original form."}
              position="left"
            >
              <button
                type="button"
                class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <IconInfoCircle size={14} stroke={1.5} />
              </button>
            </Tooltip>
          </div>

          <ul class="space-y-2">
            {#each languageSettings.contentLanguages as lang, index}
              {@const langInfo = availableLanguages.find(l => l.value === lang)}
              {@const isMainLanguage = index === 0}
              <li class="flex items-center gap-2 rounded bg-white dark:bg-gray-900 px-3 py-2 border border-gray-200 dark:border-gray-700">
                <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {langInfo?.label || lang}
                </span>
                {#if isMainLanguage}
                  <Tooltip
                    text={s("settings.language.cannotRemoveMain") || "Cannot remove your main language"}
                    position="left"
                  >
                    <button
                      type="button"
                      disabled
                      class="text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      aria-label="Cannot remove main language"
                    >
                      <IconX size={16} stroke={1.5} />
                    </button>
                  </Tooltip>
                {:else}
                  <button
                    type="button"
                    onclick={() => removeLanguagePreference(lang)}
                    class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    aria-label="Remove"
                  >
                    <IconX size={16} stroke={1.5} />
                  </button>
                {/if}
              </li>
            {/each}
          </ul>

          {#if availableToAdd.length > 0}
            <div class="flex gap-2 mt-2">
              <Select
            value={selectedLanguageToAdd}
            options={[
              { value: '', label: s("settings.language.selectLanguage") || "Select a language..." },
              ...availableToAdd
            ]}
            onChange={(value: string) => {
              selectedLanguageToAdd = value;
              if (value) {
                addLanguagePreference(value);
                selectedLanguageToAdd = '';
              }
            }}
            className="flex-1 min-w-[240px]"
            height="h-10"
              />
            </div>
          {:else}
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {s("settings.language.allLanguagesAdded") || "All available languages have been added."}
            </p>
          {/if}

          {#if languageSettings.contentLanguages.length > 0}
            {@const validPrefs = languageSettings.contentLanguages.filter(lang => lang !== 'default' && lang !== 'source' && lang !== 'custom')}
            {@const mainLang = validPrefs[0]}
            {@const additionalLangs = validPrefs.slice(1)}
            {@const mainLangInfo = availableLanguages.find(l => l.value === mainLang)}
            {@const mainLangName = mainLangInfo?.label.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'English'}

            <p class="text-xs text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {#if additionalLangs.length === 0}
                {s("settings.language.customExplanationMainOnly", { mainLang: mainLangName }) || `Articles in ${mainLangName} will be shown in the original language, all others translated into ${mainLangName}.`}
              {:else if additionalLangs.length === 1}
                {@const additionalLang = availableLanguages.find(l => l.value === additionalLangs[0])?.label.replace(/\s*\([^)]*\)\s*$/, '').trim() || additionalLangs[0]}
                {s("settings.language.customExplanationTwoLangs", { mainLang: mainLangName, additionalLang }) || `Articles in ${mainLangName} or ${additionalLang} will be shown in the original language, all others translated into ${mainLangName}.`}
              {:else}
                {@const allSpeakNames = validPrefs.map(lang => {
                  const info = availableLanguages.find(l => l.value === lang);
                  return info?.label.replace(/\s*\([^)]*\)\s*$/, '').trim() || lang;
                })}
                {@const lastLang = allSpeakNames[allSpeakNames.length - 1]}
                {@const otherLangs = allSpeakNames.slice(0, -1).join(', ')}
                {s("settings.language.customExplanationMultipleLangs", { languages: otherLangs, lastLang, mainLang: mainLangName }) || `Articles in ${otherLangs}, or ${lastLang} will be shown in the original language, all others translated into ${mainLangName}.`}
              {/if}
            </p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

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
