<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { settings, themeSettings } from '$lib/data/settings.svelte.js';
import { IconMoon, IconSun } from '@tabler/icons-svelte';

function handleChange(value: 'system' | 'light' | 'dark') {
	themeSettings.theme = value;
	settings.theme.save();
}
</script>

<div class="flex flex-col space-y-2">
	<span class="text-sm font-medium text-primary-700" id="theme-label">
		{s('settings.theme.label') || 'Theme'}
	</span>
	<div
		class="inline-flex h-10 w-full rounded-full border border-primary-400 bg-white dark:border-zinc-600 dark:bg-zinc-800 overflow-hidden"
		role="radiogroup"
		aria-labelledby="theme-label"
	>
		<!-- System Default -->
		<button
			type="button"
			role="radio"
			aria-checked={themeSettings.theme === 'system'}
			class="flex h-full flex-1 items-center justify-center border-e border-primary-400 px-1 text-xs whitespace-nowrap dark:border-zinc-600 {themeSettings.theme ===
			'system'
				? 'bg-primary rounded-s-full text-white dark:bg-zinc-700'
				: 'text-primary-800 dark:text-zinc-400'} focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:rounded-s-full focus-visible:ring-2 focus-visible:ring-focus-ring"
			onclick={() => handleChange('system')}
		>
			{s('settings.theme.system') || 'System Default'}
		</button>

		<!-- Dark -->
		<button
			type="button"
			role="radio"
			aria-checked={themeSettings.theme === 'dark'}
			class="flex h-full flex-1 items-center justify-center border-e border-primary-400 px-2 text-xs font-medium whitespace-nowrap dark:border-zinc-600 {themeSettings.theme ===
			'dark'
				? 'bg-primary text-white dark:bg-zinc-700'
				: 'text-primary-800 dark:text-zinc-400'} focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-focus-ring"
			onclick={() => handleChange('dark')}
		>
			<IconMoon size={14} class="me-1" />
			{s('settings.theme.dark') || 'Dark'}
		</button>

		<!-- Light -->
		<button
			type="button"
			role="radio"
			aria-checked={themeSettings.theme === 'light'}
			class="flex h-full flex-1 items-center justify-center px-2 text-xs font-medium whitespace-nowrap {themeSettings.theme ===
			'light'
				? 'bg-primary rounded-e-full text-white dark:bg-zinc-700'
				: 'text-primary-800 dark:text-zinc-400'} focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:rounded-e-full focus-visible:ring-2 focus-visible:ring-focus-ring"
			onclick={() => handleChange('light')}
		>
			<IconSun size={14} class="me-1" />
			{s('settings.theme.light') || 'Light'}
		</button>
	</div>
</div>
