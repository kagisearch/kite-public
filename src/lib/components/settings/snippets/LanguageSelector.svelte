<script lang="ts">
  import { s } from "$lib/client/localization.svelte";
  import Select from "$lib/components/Select.svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import { SUPPORTED_LANGUAGES } from "$lib/constants/languages.js";
  import {
    language,
    type SupportedLanguage,
  } from "$lib/stores/language.svelte.js";
  import { IconInfoCircle } from "@tabler/icons-svelte";

  // Props
  interface Props {
    showTooltip?: boolean;
    showLoadingSpinner?: boolean;
  }

  const { showTooltip = false, showLoadingSpinner = false }: Props = $props();

  // Language options - exclude "default" since UI needs a specific language
  const languageOptions = $derived(
    SUPPORTED_LANGUAGES.filter((lang) => lang.code !== "default").map(
      (lang) => ({
        value: lang.code,
        label: lang.name,
      }),
    ),
  );

  // Loading state
  let isLoading = $state(false);

  // Handle language change
  async function handleLanguageChange(newLanguage: string) {
    language.set(newLanguage as SupportedLanguage);

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
        text={s("settings.uiLanguage.tooltip") ||
          "Controls the language of buttons, menus, and interface text."}
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
      value={language.current as string}
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
