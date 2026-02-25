<script lang="ts">
import {
	IconAlertTriangle,
	IconChevronDown,
	IconChevronUp,
	IconCircleCheck,
	IconCircleX,
	IconLoader2,
	IconPlus,
	IconQuestionMark,
	IconTrash,
	IconX,
} from '@tabler/icons-svelte';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
import { s } from '$lib/client/localization.svelte';
import type { FeedCheckResult } from '$lib/utils/feedContribution';

interface Props {
	addedFeeds: FeedCheckResult[];
	duplicateFeeds: string[];
	validFeeds: FeedCheckResult[];
	errorFeeds: FeedCheckResult[];
	unknownFeeds: FeedCheckResult[];
	pendingFeeds: FeedCheckResult[];
	allErrored: boolean;
	parseError: string | null;
	onAddFeeds: (input: string) => boolean;
	onRemoveFeed: (url: string) => void;
	onRemoveAllErrored: () => void;
}

let {
	addedFeeds,
	duplicateFeeds,
	validFeeds,
	errorFeeds,
	unknownFeeds,
	pendingFeeds,
	allErrored,
	parseError,
	onAddFeeds,
	onRemoveFeed,
	onRemoveAllErrored,
}: Props = $props();

let feedUrlsInput = $state('');
let showDuplicates = $state(false);

// Auto-expand duplicates section when new duplicates are added
let prevDuplicateCount = 0;
$effect(() => {
	if (duplicateFeeds.length > prevDuplicateCount) {
		showDuplicates = true;
	}
	prevDuplicateCount = duplicateFeeds.length;
});

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		handleAdd();
	}
}

function handleAdd() {
	if (!feedUrlsInput.trim()) return;
	if (onAddFeeds(feedUrlsInput)) {
		feedUrlsInput = '';
	}
}
</script>

<div class="bg-modal-bg rounded-lg border border-primary-200 p-5">
	<h2 class="text-base font-semibold text-primary mb-4">
		{s('contribute.step2')}
	</h2>

	<div class="space-y-3">
		<div>
			<textarea
				bind:value={feedUrlsInput}
				onkeydown={handleKeydown}
				placeholder={s('contribute.feedInputPlaceholder')}
				aria-label={s('contribute.step2')}
				rows="3"
				class="w-full px-3 py-2 border rounded-lg bg-input-bg text-primary placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-focus-ring text-sm font-mono resize-y
					{parseError ? 'border-red-300 dark:border-red-600' : 'border-primary-300'}"
			></textarea>
			{#if parseError}
				<p class="mt-1 text-xs text-red-600 dark:text-red-400">{parseError}</p>
			{/if}
		</div>

		<button
			onclick={handleAdd}
			disabled={!feedUrlsInput.trim()}
			class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors
				bg-blue-600 hover:bg-blue-700 disabled:bg-primary-200 disabled:dark:bg-primary-700 text-white disabled:text-primary-500 disabled:dark:text-primary-400 disabled:cursor-not-allowed"
		>
			<IconPlus size={16} />
			{s('contribute.addFeeds')}
		</button>

		<!-- Duplicate feeds -->
		{#if duplicateFeeds.length > 0}
			<div class="text-xs text-amber-600 dark:text-amber-400">
				<button
					onclick={() => showDuplicates = !showDuplicates}
					aria-expanded={showDuplicates}
					class="flex items-center gap-1.5 hover:underline"
				>
					<IconAlertTriangle size={14} class="shrink-0" />
					<span>{s('contribute.duplicatesSkipped', { count: String(duplicateFeeds.length) })}</span>
					{#if showDuplicates}
						<IconChevronUp size={12} />
					{:else}
						<IconChevronDown size={12} />
					{/if}
				</button>
				{#if showDuplicates}
					<div class="mt-1.5 ml-5 space-y-0.5 text-[11px] font-mono text-amber-500 dark:text-amber-500">
						{#each duplicateFeeds as url}
							<div class="truncate" title={url}>{url}</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Added feeds list -->
	{#if addedFeeds.length > 0}
		<div class="mt-4">
			<!-- Summary bar -->
			<div class="flex items-center justify-between mb-2">
				<div class="text-xs text-primary-600" aria-live="polite">
					{s('contribute.feedsAdded', { count: String(addedFeeds.length) })}
					{#if validFeeds.length > 0}
						&mdash; <span class="text-green-600 dark:text-green-400">{s('contribute.validCount', { count: String(validFeeds.length) })}</span>
					{/if}
					{#if unknownFeeds.length > 0}
						&mdash; <span class="text-amber-600 dark:text-amber-400">{s('contribute.unverifiedCount', { count: String(unknownFeeds.length) })}</span>
					{/if}
					{#if errorFeeds.length > 0}
						&mdash; <span class="text-red-600 dark:text-red-400">{s('contribute.errorCount', { count: String(errorFeeds.length) })}</span>
					{/if}
					{#if pendingFeeds.length > 0}
						&mdash; <span class="text-gray-500">{s('contribute.checkingCount', { count: String(pendingFeeds.length) })}</span>
					{/if}
				</div>

				{#if errorFeeds.length > 0}
					<button
						onclick={onRemoveAllErrored}
						class="text-[11px] text-red-500 dark:text-red-400 hover:underline inline-flex items-center gap-1"
					>
						<IconTrash size={12} />
						{s('contribute.removeErrored', { count: String(errorFeeds.length) })}
					</button>
				{/if}
			</div>

			<div style="max-height: 18rem;">
				<OverlayScrollbarsComponent
					options={{ scrollbars: { autoHide: 'leave', autoHideDelay: 100 } }}
				>
					<div class="space-y-1" style="max-height: 18rem;">
						{#each addedFeeds as feed (feed.url)}
							<div class="flex items-center gap-2 py-1.5 px-2 rounded-md group
								{feed.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-primary-50'}">
								<!-- Status icon -->
								<span class="shrink-0" aria-label={feed.error || feed.status} title={feed.error || feed.status}>
									{#if feed.status === 'checking'}
										<IconLoader2 size={16} class="animate-spin text-gray-400" />
									{:else if feed.status === 'valid'}
										<IconCircleCheck size={16} class="text-green-500" />
									{:else if feed.status === 'error'}
										<IconCircleX size={16} class="text-red-500" />
									{:else if feed.status === 'unknown'}
										<IconQuestionMark size={16} class="text-amber-500" />
									{:else}
										<div class="w-4 h-4 rounded-full border-2 border-primary-300"></div>
									{/if}
								</span>

								<!-- URL -->
								<span class="flex-1 text-xs font-mono truncate
									{feed.status === 'error' ? 'text-red-600 dark:text-red-400 line-through' : 'text-primary-700'}"
									title={feed.url}
								>
									{feed.url}
								</span>

								<!-- Error details -->
								{#if feed.error && feed.status !== 'valid'}
									<span class="text-[10px] text-primary-400 hidden sm:inline truncate max-w-40" title={feed.error}>
										{feed.error}
									</span>
								{/if}

								<!-- Remove button -->
								<button
									onclick={() => onRemoveFeed(feed.url)}
									class="shrink-0 p-0.5 text-primary-400 hover:text-red-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity"
									aria-label={s('contribute.removeFeed')}
								>
									<IconX size={14} />
								</button>
							</div>
						{/each}
					</div>
				</OverlayScrollbarsComponent>
			</div>

			<!-- All-errored warning -->
			{#if allErrored}
				<div class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
					<div class="flex items-start gap-2">
						<IconCircleX size={16} class="shrink-0 mt-0.5 text-red-500" />
						<p class="text-xs text-red-700 dark:text-red-300">
							{s('contribute.allFeedsFailed')}
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
