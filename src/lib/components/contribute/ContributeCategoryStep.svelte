<script lang="ts">
import {
	IconAlertTriangle,
	IconChevronDown,
	IconChevronUp,
	IconCircleX,
	IconInfoCircle,
	IconLoader2,
} from '@tabler/icons-svelte';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
import { s } from '$lib/client/localization.svelte';
import Select from '$lib/components/Select.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import type { KiteFeedsData, PendingPrCategory } from '$lib/utils/feedContribution';

interface Props {
	mode: 'existing' | 'new';
	feedsData: KiteFeedsData | null;
	loadingFeeds: boolean;
	loadError: string | null;
	pendingPrs: PendingPrCategory[];
	selectedCategory: string;
	newCategoryName: string;
	newCategoryLanguage: string;
	showExistingFeeds: boolean;
	onModeChange: (mode: 'existing' | 'new') => void;
	onCategoryChange: (value: string) => void;
	onLoadRetry: () => void;
}

let {
	mode = $bindable(),
	feedsData,
	loadingFeeds,
	loadError,
	pendingPrs,
	selectedCategory = $bindable(),
	newCategoryName = $bindable(),
	newCategoryLanguage = $bindable(),
	showExistingFeeds = $bindable(),
	onModeChange,
	onCategoryChange,
	onLoadRetry,
}: Props = $props();

// Detect language codes in category name like "Switzerland (IT)" or "Japan (EN)"
const LANG_CODE_PATTERN = /\s*\(\s*(?:EN|DE|ES|FR|IT|JA|PT|AR|HE|HI|KO|NL|RU|UK|ET|ZH)\s*\)\s*$/i;
const hasLanguageInName = $derived(LANG_CODE_PATTERN.test(newCategoryName.trim()));

// Build a map of category names that have pending PRs
const pendingPrMap = $derived(new Map(pendingPrs.map((pr) => [pr.categoryName, pr])));

const categoryOptions = $derived(
	feedsData
		? Object.entries(feedsData)
				.map(([name, data]) => {
					const isCore = data.category_type === 'core';
					const pendingPr = pendingPrMap.get(name);
					let label = name;

					if (isCore) {
						label += ` (${s('contribute.coreCategory')})`;
					} else {
						label += ` (${s('contribute.feedCount', { count: String(data.feeds.length) })})`;
					}

					if (pendingPr) {
						label += ` · ${s('contribute.pendingFeedsAdded', { count: String(pendingPr.feedCount) })}`;
					}

					return { value: name, label };
				})
				.sort((a, b) => a.value.localeCompare(b.value))
		: [],
);

// Pending PR categories that don't exist in feeds data yet (new categories from PRs)
const pendingOnlyOptions = $derived(
	pendingPrs
		.filter((pr) => pr.isNew && feedsData && !feedsData[pr.categoryName])
		.map((pr) => ({
			value: pr.categoryName,
			label: `${pr.categoryName} (${s('contribute.pendingPr')} · ${s('contribute.pendingFeedCount', { count: String(pr.feedCount) })})`,
		})),
);

const allCategoryOptions = $derived([
	...categoryOptions,
	...(pendingOnlyOptions.length > 0
		? [
				{ value: '', label: `── ${s('contribute.pendingPr')} ──`, disabled: true },
				...pendingOnlyOptions,
			]
		: []),
]);

const currentCategoryData = $derived(
	feedsData && selectedCategory ? feedsData[selectedCategory] : null,
);

const LANGUAGES = [
	{ value: 'en', label: 'English' },
	{ value: 'de', label: 'Deutsch' },
	{ value: 'es', label: 'Español' },
	{ value: 'fr', label: 'Français' },
	{ value: 'it', label: 'Italiano' },
	{ value: 'ja', label: '日本語' },
	{ value: 'pt', label: 'Português' },
	{ value: 'zh-Hans', label: '简体中文' },
	{ value: 'zh-Hant', label: '繁體中文' },
	{ value: 'ar', label: 'العربية' },
	{ value: 'he', label: 'עברית' },
	{ value: 'hi', label: 'हिन्दी' },
	{ value: 'ko', label: '한국어' },
	{ value: 'nl', label: 'Nederlands' },
	{ value: 'ru', label: 'Русский' },
	{ value: 'uk', label: 'Українська' },
	{ value: 'et', label: 'Eesti' },
];
</script>

<div class="bg-modal-bg rounded-lg border border-primary-200 p-5">
	<h2 class="text-base font-semibold text-primary mb-4">
		{s('contribute.step1')}
	</h2>

	<!-- Mode toggle -->
	<div class="flex gap-2 mb-4">
		<button
			onclick={() => onModeChange('existing')}
			aria-pressed={mode === 'existing'}
			class="px-3 py-1.5 text-sm rounded-md transition-colors {mode === 'existing'
				? 'bg-blue-600 text-white'
				: 'bg-primary-100 text-primary-700 hover:bg-primary-200'}"
		>
			{s('contribute.existingCategory')}
		</button>
		<button
			onclick={() => onModeChange('new')}
			aria-pressed={mode === 'new'}
			class="px-3 py-1.5 text-sm rounded-md transition-colors {mode === 'new'
				? 'bg-blue-600 text-white'
				: 'bg-primary-100 text-primary-700 hover:bg-primary-200'}"
		>
			{s('contribute.newCategory')}
		</button>
	</div>

	{#if mode === 'existing'}
		{#if loadingFeeds}
			<div class="flex items-center gap-2 text-sm text-primary-600">
				<IconLoader2 size={16} class="animate-spin" />
				{s('contribute.loadingCategories')}
			</div>
		{:else if loadError}
			<div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
				<IconCircleX size={16} />
				{loadError}
				<button
					onclick={onLoadRetry}
					class="text-accent-links hover:underline"
				>
					{s('contribute.retry')}
				</button>
			</div>
		{:else}
			<Select
				value={selectedCategory}
				options={allCategoryOptions}
				placeholder={s('contribute.searchCategories')}
				searchable={true}
				onChange={onCategoryChange}
				id="category-select"
				label={s('contribute.existingCategory')}
				hideLabel={true}
			/>

			{#if currentCategoryData}
				{@const isCore = currentCategoryData.category_type === 'core'}
				{@const pendingPr = pendingPrMap.get(selectedCategory)}

				{#if isCore}
					<p class="mt-3 text-xs text-primary-500 flex items-start gap-1.5">
						<IconInfoCircle size={14} class="shrink-0 mt-0.5" />
						<span>{s('contribute.coreCategoryNote')}</span>
					</p>
				{/if}

				{#if pendingPr}
					<p class="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
						<IconInfoCircle size={14} class="shrink-0 mt-0.5" />
						<span>
							{s('contribute.pendingPrNote')}
							<a
								href={pendingPr.prUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-links hover:underline"
							>
								{s('contribute.pendingPrLink', { number: String(pendingPr.prNumber) })}
							</a>
						</span>
					</p>
				{/if}

				<div class="mt-3 text-sm text-primary-600">
					<span class="font-medium text-primary">
						{s('contribute.feedCount', { count: String(currentCategoryData.feeds.length) })}
					</span>
					{s('contribute.inThisCategory')}
					{#if currentCategoryData.source_language !== 'en'}
						<span class="ml-2 px-1.5 py-0.5 bg-primary-100 rounded text-xs">
							{currentCategoryData.source_language}
						</span>
					{/if}
					{#if currentCategoryData.feeds.length > 0}
						<button
							onclick={() => showExistingFeeds = !showExistingFeeds}
							aria-expanded={showExistingFeeds}
							class="ml-2 text-accent-links hover:underline inline-flex items-center gap-0.5"
						>
							{showExistingFeeds ? s('contribute.hideFeeds') : s('contribute.showFeeds')}
							{#if showExistingFeeds}
								<IconChevronUp size={14} />
							{:else}
								<IconChevronDown size={14} />
							{/if}
						</button>
					{/if}
				</div>

				{#if showExistingFeeds && currentCategoryData.feeds.length > 0}
					<div class="mt-2 bg-primary-50 rounded-md" style="max-height: 12rem;">
						<OverlayScrollbarsComponent
							options={{ scrollbars: { autoHide: 'leave', autoHideDelay: 100 } }}
						>
							<div class="p-3 text-xs font-mono space-y-0.5" style="max-height: 12rem;">
								{#each currentCategoryData.feeds as feed}
									<div class="text-primary-600 truncate" title={feed}>
										{feed}
									</div>
								{/each}
							</div>
						</OverlayScrollbarsComponent>
					</div>
				{/if}
			{:else if selectedCategory && pendingPrMap.has(selectedCategory)}
				{@const pendingPr = pendingPrMap.get(selectedCategory)}
				{#if pendingPr}
					<p class="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
						<IconInfoCircle size={14} class="shrink-0 mt-0.5" />
						<span>
							{s('contribute.pendingPrNote')}
							<a
								href={pendingPr.prUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-links hover:underline"
							>
								{s('contribute.pendingPrLink', { number: String(pendingPr.prNumber) })}
							</a>
						</span>
					</p>
				{/if}
			{/if}
		{/if}
	{:else}
		<!-- New category mode -->
		<div class="space-y-3">
			<div>
				<label for="new-category-name" class="block text-sm font-medium text-primary-700 mb-1">
					{s('contribute.categoryName')}
				</label>
				<input
					id="new-category-name"
					type="text"
					bind:value={newCategoryName}
					placeholder={s('contribute.categoryNamePlaceholder')}
					class="w-full px-3 py-2 border border-primary-300 rounded-lg bg-input-bg text-primary placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-focus-ring text-sm"
				/>
				{#if newCategoryName.trim() && feedsData && feedsData[newCategoryName.trim()]}
					<p class="mt-1 text-xs text-amber-600 dark:text-amber-400">
						{s('contribute.categoryExists')}
						<button
							onclick={() => { mode = 'existing'; selectedCategory = newCategoryName.trim(); newCategoryName = ''; }}
							class="text-accent-links hover:underline"
						>
							{s('contribute.switchToIt')}
						</button>
					</p>
				{/if}
				{#if hasLanguageInName}
					<p class="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
						<IconAlertTriangle size={14} class="shrink-0 mt-0.5" />
						<span>
							{s('contribute.languageInNameWarning')}
						</span>
					</p>
				{/if}
			</div>
			<div>
				<div class="flex items-center gap-1.5 mb-1">
					<label for="new-category-lang" class="block text-sm font-medium text-primary-700">
						{s('contribute.feedLanguage')}
					</label>
					<Tooltip text={s('contribute.feedLanguageTooltip')} position="top">
						<IconInfoCircle size={14} class="text-primary-400 hover:text-primary-600 cursor-help" />
					</Tooltip>
				</div>
				<Select
					value={newCategoryLanguage}
					options={LANGUAGES}
					onChange={(v: string) => newCategoryLanguage = v}
					id="new-category-lang"
					label={s('contribute.feedLanguage')}
					hideLabel={true}
				/>
			</div>
		</div>
	{/if}
</div>
