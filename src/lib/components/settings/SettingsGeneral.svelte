<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { theme, type ThemeOption } from '$lib/stores/theme.svelte.js';
import { language, type SupportedLanguage } from '$lib/stores/language.svelte.js';
import { dataLanguage } from '$lib/stores/dataLanguage.svelte.js';
import { fontSize, type FontSize } from '$lib/stores/fontSize.svelte.js';
import { storyCount } from '$lib/stores/storyCount.svelte.js';
import { settings } from '$lib/stores/settings.svelte.js';
import type { StoryExpandMode } from '$lib/stores/settings.svelte.js';
import { SUPPORTED_LANGUAGES } from '$lib/constants/languages.js';
import { dataReloadService } from '$lib/services/dataService.js';
import Select from '$lib/components/Select.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import { IconInfoCircle } from '@tabler/icons-svelte';

// Props
interface Props {
	onShowAbout?: () => void;
}

let { onShowAbout }: Props = $props();

// Theme options for display
const themeOptions = $derived([
	{ value: 'system', label: s('settings.theme.system') || 'System' },
	{ value: 'light', label: s('settings.theme.light') || 'Light' },
	{ value: 'dark', label: s('settings.theme.dark') || 'Dark' }
]);

// UI Language options - exclude "default" since UI needs a specific language
const uiLanguageOptions = $derived(
	SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'default').map((lang) => ({
		value: lang.code,
		label: lang.name
	}))
);

// Data Language options - include "default" for untranslated content
const dataLanguageOptions = $derived(
	SUPPORTED_LANGUAGES.map((lang) => ({
		value: lang.code,
		label: lang.code === 'default' ? (s('settings.language.default') || 'Default') : lang.name
	}))
);

// Font size options for display
const fontSizeOptions = $derived([
	{ value: 'xs', label: s('settings.fontSize.xs') || 'Extra Small' },
	{ value: 'small', label: s('settings.fontSize.small') || 'Small' },
	{ value: 'normal', label: s('settings.fontSize.normal') || 'Normal' },
	{ value: 'large', label: s('settings.fontSize.large') || 'Large' },
	{ value: 'xl', label: s('settings.fontSize.xl') || 'Extra Large' }
]);

// Local state that syncs with stores
let currentTheme = $state(theme.current as string);
let currentLanguage = $state(language.current as string);
let currentDataLanguage = $state(dataLanguage.current as string);
let currentFontSize = $state(fontSize.current as string);
let currentCategoryHeaderPosition = $state(settings.categoryHeaderPosition as string);
let currentStoryExpandMode = $state(settings.storyExpandMode as string);
let isLanguageLoading = $state(false);
let isDataLanguageLoading = $state(false);

// Story expand mode options for display
const storyExpandModeOptions = $derived([
	{ value: 'always', label: s('settings.storyExpandMode.always') || 'Always expand all' },
	{ value: 'doubleClick', label: s('settings.storyExpandMode.doubleClick') || 'Double-click to expand all' },
	{ value: 'never', label: s('settings.storyExpandMode.never') || 'Never expand all' }
]);

// Sync local state with stores
$effect(() => {
	currentTheme = theme.current as string;
});

$effect(() => {
	currentLanguage = language.current as string;
});

$effect(() => {
	currentDataLanguage = dataLanguage.current as string;
});

$effect(() => {
	currentFontSize = fontSize.current as string;
});

$effect(() => {
	currentCategoryHeaderPosition = settings.categoryHeaderPosition as string;
});

$effect(() => {
	currentStoryExpandMode = settings.storyExpandMode as string;
});

// Theme change handler
function handleThemeChange(newTheme: string) {
	theme.set(newTheme as ThemeOption);
	currentTheme = newTheme;
}

// UI Language change handler  
async function handleLanguageChange(newLanguage: string) {
	language.set(newLanguage as SupportedLanguage);
	currentLanguage = newLanguage;
	isLanguageLoading = true;
	
	try {
		// UI language change only requires locale reload
		await new Promise(resolve => setTimeout(resolve, 500)); // Give time for locale to load
	} finally {
		isLanguageLoading = false;
	}
}

// Data Language change handler
async function handleDataLanguageChange(newLanguage: string) {
	dataLanguage.set(newLanguage as SupportedLanguage);
	currentDataLanguage = newLanguage;
	isDataLanguageLoading = true;
	
	try {
		// Reload all data for the new data language
		await dataReloadService.reloadData();
	} finally {
		isDataLanguageLoading = false;
	}
}

// Font size change handler
function handleFontSizeChange(newSize: string) {
	fontSize.set(newSize as FontSize);
	currentFontSize = newSize;
}

// Story count change handler
function handleStoryCountChange(count: number) {
	storyCount.set(count);
}

// Category header position change handler
function handleCategoryHeaderPositionChange(position: string) {
	settings.setCategoryHeaderPosition(position as any);
	currentCategoryHeaderPosition = position;
}

function handleStoryExpandModeChange(mode: StoryExpandMode) {
	settings.setStoryExpandMode(mode);
	currentStoryExpandMode = mode;
}

// Show about screen
function showAbout() {
	if (onShowAbout) onShowAbout();
}
</script>

<div class="space-y-6">
	<!-- Theme Setting -->
	<div class="flex flex-col space-y-2">
		<Select
			bind:value={currentTheme}
			options={themeOptions}
			label={s('settings.theme.label') || 'Theme'}
			onChange={handleThemeChange}
		/>
	</div>

	<!-- UI Language Setting -->
	<div class="flex flex-col space-y-2">
		<div class="flex items-center space-x-1 mb-1">
			<label for="ui-language-select" class="text-sm font-medium text-gray-700 dark:text-gray-300">
				{s('settings.uiLanguage.label') || 'Interface Language'}
			</label>
			<Tooltip text={s('settings.uiLanguage.tooltip') || 'Controls the language of buttons, menus, and interface text. \'Default\' uses your browser\'s language.'} position="bottom">
				<button type="button" class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
					<IconInfoCircle size={14} stroke={1.5} />
				</button>
			</Tooltip>
		</div>
		<div class="relative">
			<Select
				id="ui-language-select"
				bind:value={currentLanguage}
				options={uiLanguageOptions}
				hideLabel={true}
				label={s('settings.uiLanguage.label') || 'Interface Language'}
				onChange={handleLanguageChange}
			/>
			{#if isLanguageLoading}
				<div class="absolute right-3 top-2.5">
					<div class="animate-spin h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"></div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Data Language Setting -->
	<div class="flex flex-col space-y-2">
		<div class="flex items-center space-x-1 mb-1">
			<label for="data-language-select" class="text-sm font-medium text-gray-700 dark:text-gray-300">
				{s('settings.dataLanguage.label') || 'Content Language'}
			</label>
			<Tooltip text={s('settings.dataLanguage.tooltip') || 'News stories are generated in their original source language, then translated. \'Default\' shows stories in their original languages without translation.'} position="bottom">
				<button type="button" class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
					<IconInfoCircle size={14} stroke={1.5} />
				</button>
			</Tooltip>
		</div>
		<div class="relative">
			<Select
				id="data-language-select"
				bind:value={currentDataLanguage}
				options={dataLanguageOptions}
				hideLabel={true}
				label={s('settings.dataLanguage.label') || 'Content Language'}
				onChange={handleDataLanguageChange}
			/>
			{#if isDataLanguageLoading}
				<div class="absolute right-3 top-2.5">
					<div class="animate-spin h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"></div>
				</div>
			{/if}
		</div>
		<div class="mt-1 flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
			<a
				href="https://kagi.com/translate"
				target="_blank"
				class="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
			>
				<span>{s('settings.language.poweredBy') || 'Translated with Kagi Translate'}</span>
				<img src="/svg/translate.svg" alt="Kagi Translate" class="ml-1 h-3 w-3" />
				</a>
		</div>
	</div>

	<!-- Mobile-only category header position setting -->
	<div class="flex flex-col space-y-2 md:hidden">
		<Select
			bind:value={currentCategoryHeaderPosition}
			options={[
				{ value: 'bottom', label: s('settings.categoryHeaderPosition.bottom') || 'Bottom' },
				{ value: 'top', label: s('settings.categoryHeaderPosition.top') || 'Top' }
			]}
			label={s('settings.categoryHeaderPosition.label') || 'Category Header Position'}
			onChange={handleCategoryHeaderPositionChange}
		/>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
			{s('settings.categoryHeaderPosition.description') || 'Choose where category tabs appear on mobile devices'}
		</p>
	</div>

	<!-- Font Size Setting -->
	<div class="flex flex-col space-y-2">
		<Select
			bind:value={currentFontSize}
			options={fontSizeOptions}
			label={s('settings.fontSize.label') || 'Text Size'}
			onChange={handleFontSizeChange}
		/>
	</div>

	<!-- Story Expand Mode Setting -->
	<div class="flex flex-col space-y-2">
			   <Select
					   bind:value={currentStoryExpandMode}
					   options={storyExpandModeOptions}
					   label={s('settings.storyExpandMode.label') || 'Story Expand Mode'}
					   onChange={handleStoryExpandModeChange}
			   />
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
			{s('settings.storyExpandMode.description') || 'Choose how stories expand in a category'}
		</p>
	</div>

	<!-- Story Count Setting -->
	<div class="flex flex-col space-y-2">
		<label for="story-count-range" class="text-sm font-medium text-gray-700 dark:text-gray-300">
			{s('settings.storyCount.label') || 'Stories per category'}: {storyCount.current}
		</label>
		<input
			id="story-count-range"
			type="range"
			min="3"
			max="12"
			value={storyCount.current}
			oninput={(e) => {
				const target = e.target as HTMLInputElement;
				if (target) handleStoryCountChange(parseInt(target.value));
			}}
			class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
		/>
	</div>

	<!-- About Button -->
	<div class="flex flex-col space-y-2">
		<button
			onclick={showAbout}
			class="flex w-full items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
		>
			<img
				src={theme.current === 'dark' ? '/svg/kite_dark.svg' : '/svg/kite.svg'}
				alt={s('app.logo.iconAlt') || 'Kite'}
				class="h-4 w-4"
			/>
			<span>{s('settings.aboutKite.button') || 'About Kite'}</span>
		</button>
	</div>
</div> 