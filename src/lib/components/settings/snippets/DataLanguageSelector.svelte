<script lang="ts">
  import { s } from "$lib/client/localization.svelte";
  import Select from "$lib/components/Select.svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import { SUPPORTED_LANGUAGES } from "$lib/constants/languages.js";
  import { dataReloadService } from "$lib/services/dataService.js";
  import { dataLanguage } from "$lib/stores/dataLanguage.svelte.js";
  import type { SupportedLanguage } from "$lib/stores/language.svelte";
  import { IconInfoCircle } from "@tabler/icons-svelte";
  import { base } from "$app/paths";

  // Props
  interface Props {
    showTooltip?: boolean;
    showLoadingSpinner?: boolean;
    showTranslateLink?: boolean;
  }

  const {
    showTooltip = false,
    showLoadingSpinner = false,
    showTranslateLink = false,
  }: Props = $props();

  // Data Language options - include "default" for untranslated content
  const dataLanguageOptions = $derived(
    SUPPORTED_LANGUAGES.map((lang) => ({
      value: lang.code,
      label:
        lang.code === "default"
          ? s("settings.language.default") || "Default"
          : lang.name,
    })),
  );

  // Loading state
  let isLoading = $state(false);

  // Handle data language change
  async function handleDataLanguageChange(newLanguage: string) {
    dataLanguage.set(newLanguage as SupportedLanguage);

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
        text={s("settings.dataLanguage.tooltip") ||
          "News stories are generated in their original source language, then translated. 'Default' shows stories in their original languages without translation."}
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
      value={dataLanguage.current as string}
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
          src={`${base}/svg/translate.svg`}
          alt="Kagi Translate"
          class="ml-1 h-3 w-3"
        />
      </a>
    </div>
  {/if}
</div>
