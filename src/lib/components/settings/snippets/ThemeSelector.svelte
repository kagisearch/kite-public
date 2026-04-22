<script lang="ts">
import { IconMoon, IconSun } from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';
import { settings, themeSettings } from '$lib/data/settings.svelte.js';
import type { Theme } from '$lib/data/settings.svelte.js';

function handleChange(value: Theme) {
	themeSettings.theme = value;
	settings.theme.save();
}

const ctpFlavors: { value: Theme; label: string; mauve: string }[] = [
	{ value: 'ctp-latte',     label: 'Latte',     mauve: '#8839ef' },
	{ value: 'ctp-frappe',    label: 'Frappé',    mauve: '#ca9ee6' },
	{ value: 'ctp-macchiato', label: 'Macchiato', mauve: '#c6a0f6' },
	{ value: 'ctp-mocha',     label: 'Mocha',     mauve: '#cba6f7' },
];
</script>

<div class="flex flex-col space-y-2">
  <span class="text-sm font-medium text-gray-700 dark:text-gray-300" id="theme-label">
    {s("settings.theme.label") || "Theme"}
  </span>

  <!-- Light / Dark / System row -->
  <div
    class="inline-flex h-10 w-full rounded-full border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800 overflow-hidden"
    role="radiogroup"
    aria-labelledby="theme-label"
  >
    <button
      type="button"
      role="radio"
      aria-checked={themeSettings.theme === 'system'}
      class="flex h-full flex-1 items-center justify-center gap-1.5 border-e border-gray-200 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600
        {themeSettings.theme === 'system'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}"
      onclick={() => handleChange('system')}
    >
      {s("settings.theme.system") || "System Default"}
    </button>

    <button
      type="button"
      role="radio"
      aria-checked={themeSettings.theme === 'light'}
      class="flex h-full flex-1 items-center justify-center gap-1.5 border-e border-gray-200 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600
        {themeSettings.theme === 'light'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}"
      onclick={() => handleChange('light')}
    >
      <IconSun size={16} />
      {s("settings.theme.light") || "Light"}
    </button>

    <button
      type="button"
      role="radio"
      aria-checked={themeSettings.theme === 'dark'}
      class="flex h-full flex-1 items-center justify-center gap-1.5 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500
        {themeSettings.theme === 'dark'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}"
      onclick={() => handleChange('dark')}
    >
      <IconMoon size={16} />
      {s("settings.theme.dark") || "Dark"}
    </button>
  </div>

  <!-- Catppuccin flavors row -->
  <div
    class="inline-flex h-10 w-full rounded-full border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800 overflow-hidden"
    role="radiogroup"
    aria-label="Catppuccin flavors"
  >
    {#each ctpFlavors as flavor, i}
      <button
        type="button"
        role="radio"
        aria-checked={themeSettings.theme === flavor.value}
        class="flex h-full flex-1 items-center justify-center gap-1.5 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500
          {i < ctpFlavors.length - 1 ? 'border-e border-gray-200 dark:border-gray-600' : ''}
          {themeSettings.theme === flavor.value
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}"
        onclick={() => handleChange(flavor.value)}
      >
        <span
          class="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
          style="background-color: {flavor.mauve}"
          aria-hidden="true"
        ></span>
        {flavor.label}
      </button>
    {/each}
  </div>
</div>
