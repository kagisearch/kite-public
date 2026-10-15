<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import { syncKnPrefsCookie } from '$lib/data/knPrefsCookie';
import {
	displaySettings,
	type FontFamily,
	type FontSize,
	type LayoutWidth,
	settings,
} from '$lib/data/settings.svelte.js';
import { experimental } from '$lib/stores/experimental.svelte.js';
import ThemeSelector from './snippets/ThemeSelector.svelte';

// Font size options for display
const fontSizeOptions = $derived([
	{ value: 'xs', label: s('settings.fontSize.xs') || 'Extra Small' },
	{ value: 'small', label: s('settings.fontSize.small') || 'Small' },
	{ value: 'normal', label: s('settings.fontSize.normal') || 'Normal' },
	{ value: 'large', label: s('settings.fontSize.large') || 'Large' },
	{ value: 'xl', label: s('settings.fontSize.xl') || 'Extra Large' },
]);

// Font family options
const fontFamilyOptions = $derived([
	{ value: 'default', label: s('settings.fontFamily.default') || 'System (Default)' },
	{
		value: 'atkinson',
		label: s('settings.fontFamily.atkinson') || 'Atkinson Hyperlegible Next',
	},
	{
		value: 'fast',
		label: s('settings.fontFamily.fast') || 'Fast Sans (faster reading)',
	},
	{
		value: 'opendyslexic',
		label: s('settings.fontFamily.opendyslexic') || 'OpenDyslexic',
	},
]);

// Layout width options
const layoutWidthOptions = $derived([
	{
		value: 'normal',
		label: s('settings.layoutWidth.normal') || 'Normal (732px)',
	},
	{
		value: 'wide',
		label: s('settings.layoutWidth.wide') || 'Wide (1024px)',
	},
	{
		value: 'full',
		label: s('settings.layoutWidth.full') || 'Full Width',
	},
]);

// Local state that syncs with stores
let currentFontSize = $state(displaySettings.fontSize as string);
let currentFontFamily = $state(displaySettings.fontFamily as string);
let currentLayoutWidth = $state(displaySettings.layoutWidth as string);

// Sync local state with stores
$effect(() => {
	currentFontSize = displaySettings.fontSize as string;
});

$effect(() => {
	currentFontFamily = displaySettings.fontFamily as string;
});

$effect(() => {
	currentLayoutWidth = displaySettings.layoutWidth as string;
});

// Font size change handler
function handleFontSizeChange(newSize: string) {
	displaySettings.fontSize = newSize as FontSize;
	settings.fontSize.save();
	syncKnPrefsCookie();
	currentFontSize = newSize;
}

function handleFontFamilyChange(newFamily: string) {
	displaySettings.fontFamily = newFamily as FontFamily;
	settings.fontFamily.save();
	currentFontFamily = newFamily;
}

function handleLayoutWidthChange(width: string) {
	displaySettings.layoutWidth = width as LayoutWidth;
	settings.layoutWidth.save();
	syncKnPrefsCookie();
	currentLayoutWidth = width;
}

// Toggle handlers for experimental features
function toggleArticleIcons() {
	experimental.toggleFeature('showArticleIcons');
}

function toggleCategoryIcons() {
	experimental.toggleFeature('showCategoryIcons');
}

function toggleChaosIndex() {
	experimental.toggleFeature('showChaosIndex');
}
</script>

<div class="space-y-8">
	<!-- Theme & Display Section -->
	<div class="space-y-4">
		<h3 class="text-base font-bold text-primary">
			{s('settings.subsections.display') || 'Display'}
		</h3>
		<div class="space-y-4 ps-2">
			<!-- Theme Setting -->
			<ThemeSelector />

			<!-- Font Size Setting -->
			<div class="flex flex-col space-y-2">
				<Select
					bind:value={currentFontSize}
					options={fontSizeOptions}
					label={s('settings.fontSize.label') || 'Text Size'}
					onChange={handleFontSizeChange}
				/>
			</div>

			<!-- Font Family Setting -->
			<div class="flex flex-col space-y-2">
				<Select
					bind:value={currentFontFamily}
					options={fontFamilyOptions}
					label={s('settings.fontFamily.label') || 'Font'}
					onChange={handleFontFamilyChange}
				/>
				<p class="mt-1 text-xs text-primary-600">
					{s('settings.fontFamily.description') ||
						'Atkinson Hyperlegible is optimized for low-vision readers. OpenDyslexic is designed for readers with dyslexia.'}
				</p>
			</div>

			<!-- Layout Width Setting (desktop only) -->
			<div class="hidden md:flex flex-col space-y-2">
				<Select
					bind:value={currentLayoutWidth}
					options={layoutWidthOptions}
					label={s('settings.layoutWidth.label') || 'Layout Width'}
					onChange={handleLayoutWidthChange}
				/>
				<p class="mt-1 text-xs text-primary-600">
					{s('settings.layoutWidth.description') ||
						'Choose how wide the content area should be on larger screens'}
				</p>
			</div>
		</div>
	</div>

	<!-- Visual Enhancements Section -->
	<div class="space-y-4">
		<h3 class="text-base font-bold text-primary">
			{s('settings.subsections.visualEnhancements') || 'Visual Enhancements'}
		</h3>
		<div class="space-y-3 ps-2">
			<!-- Article Icons -->
			<div
				class="flex items-center justify-between rounded-lg border border-primary-100 bg-white p-3 dark:bg-graphite-800/50"
			>
				<div class="flex-1 pe-4">
					<label
						for="show-article-icons"
						id="label-article-icons"
						class="text-sm font-bold text-primary"
					>
						{s('settings.experimental.articleIcons.label') || 'Show Article Icons'}
					</label>
					<p class="text-xs text-primary-600 mt-0.5">
						{s('settings.experimental.articleIcons.description') ||
							'Display emoji icons next to article titles to provide visual context.'}
					</p>
				</div>
				<button
					id="show-article-icons"
					onclick={toggleArticleIcons}
					type="button"
					class="focus-visible-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full shadow-[0_0_4px_rgba(135,136,152,0.25)] transition {experimental.showArticleIcons
						? 'bg-gradient-to-r from-[#7A6AF4] to-[#6C5EDC]'
						: 'border border-chrome-500 bg-transparent'}"
					role="switch"
					aria-checked={experimental.showArticleIcons}
					aria-labelledby="label-article-icons"
				>
					<span
						class="absolute h-4 w-4 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out {experimental.showArticleIcons
							? 'bg-white ltr:left-[calc(100%-20px)] rtl:right-[calc(100%-20px)] rtl:left-auto top-1'
							: 'border border-chrome-500 bg-transparent ltr:left-1 rtl:right-1 rtl:left-auto top-[3px]'}"
					></span>
				</button>
			</div>

			<!-- Category Icons -->
			<div
				class="flex items-center justify-between rounded-lg border border-primary-100 bg-white p-3 dark:bg-graphite-800/50"
			>
				<div class="flex-1 pe-4">
					<label
						for="show-category-icons"
						id="label-category-icons"
						class="text-sm font-bold text-primary"
					>
						{s('settings.experimental.categoryIcons.label') || 'Show Category Icons'}
					</label>
					<p class="text-xs text-primary-600 mt-0.5">
						{s('settings.experimental.categoryIcons.description') ||
							'Display icons next to category labels for better visual identification.'}
					</p>
				</div>
				<button
					id="show-category-icons"
					onclick={toggleCategoryIcons}
					type="button"
					class="focus-visible-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full shadow-[0_0_4px_rgba(135,136,152,0.25)] transition {experimental.showCategoryIcons
						? 'bg-gradient-to-r from-[#7A6AF4] to-[#6C5EDC]'
						: 'border border-chrome-500 bg-transparent'}"
					role="switch"
					aria-checked={experimental.showCategoryIcons}
					aria-labelledby="label-category-icons"
				>
					<span
						class="absolute h-4 w-4 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out {experimental.showCategoryIcons
							? 'bg-white ltr:left-[calc(100%-20px)] rtl:right-[calc(100%-20px)] rtl:left-auto top-1'
							: 'border border-chrome-500 bg-transparent ltr:left-1 rtl:right-1 rtl:left-auto top-[3px]'}"
					></span>
				</button>
			</div>

			<!-- World Tension Index -->
			<div
				class="flex items-center justify-between rounded-lg border border-primary-100 bg-white p-3 dark:bg-graphite-800/50"
			>
				<div class="flex-1 pe-4">
					<label
						for="show-chaos-index"
						id="label-chaos-index"
						class="text-sm font-bold text-primary"
					>
						{s('settings.experimental.chaosIndex.label') || 'Show World Tension Index'}
					</label>
					<p class="text-xs text-primary-600 mt-0.5">
						{s('settings.experimental.chaosIndex.description') ||
							'Display a global temperature reading of world stability based on current events.'}
					</p>
				</div>
				<button
					id="show-chaos-index"
					onclick={toggleChaosIndex}
					type="button"
					class="focus-visible-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full shadow-[0_0_4px_rgba(135,136,152,0.25)] transition {experimental.showChaosIndex
						? 'bg-gradient-to-r from-[#7A6AF4] to-[#6C5EDC]'
						: 'border border-chrome-500 bg-transparent'}"
					role="switch"
					aria-checked={experimental.showChaosIndex}
					aria-labelledby="label-chaos-index"
				>
					<span
						class="absolute h-4 w-4 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out {experimental.showChaosIndex
							? 'bg-white ltr:left-[calc(100%-20px)] rtl:right-[calc(100%-20px)] rtl:left-auto top-1'
							: 'border border-chrome-500 bg-transparent ltr:left-1 rtl:right-1 rtl:left-auto top-[3px]'}"
					></span>
				</button>
			</div>
		</div>
	</div>
</div>
