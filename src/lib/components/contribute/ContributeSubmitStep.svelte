<script lang="ts">
import {
	IconBrandGithub,
	IconCheck,
	IconCircleCheck,
	IconCircleX,
	IconClipboard,
	IconExternalLink,
	IconLoader2,
	IconSend,
} from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';
import { copyToClipboard, type FeedCheckResult } from '$lib/utils/feedContribution';

interface Props {
	submitResult: {
		type: 'success' | 'error' | 'manual';
		message: string;
		prUrl?: string;
		snippet?: {
			editUrl: string;
			fileName: string;
			content: string;
			isNew: boolean;
			isFullFile: boolean;
		};
	} | null;
	isSubmitting: boolean;
	canSubmit: boolean;
	allErrored: boolean;
	mode: 'existing' | 'new';
	githubMode: 'auto' | 'manual';
	activeCategoryName: string;
	submittableFeeds: FeedCheckResult[];
	errorFeeds: FeedCheckResult[];
	pendingFeeds: FeedCheckResult[];
	onSubmit: () => void;
	onReset: () => void;
}

let {
	submitResult,
	isSubmitting,
	canSubmit,
	allErrored,
	mode,
	githubMode,
	activeCategoryName,
	submittableFeeds,
	errorFeeds,
	pendingFeeds,
	onSubmit,
	onReset,
}: Props = $props();

let copied = $state(false);

async function handleCopy(text: string) {
	const ok = await copyToClipboard(text);
	if (ok) {
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}
}
</script>

<div class="bg-modal-bg rounded-lg border border-primary-200 p-5">
	<h2 class="text-base font-semibold text-primary mb-4">
		{s('contribute.step3')}
	</h2>

	{#if submitResult?.type === 'success'}
		<!-- Auto mode: PR created successfully -->
		<div role="alert" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
			<div class="flex items-start gap-2">
				<IconCircleCheck size={20} class="shrink-0 text-green-600 dark:text-green-400" />
				<div>
					<p class="text-sm font-medium text-green-800 dark:text-green-200">
						{submitResult.message}
					</p>
					{#if submitResult.prUrl}
						<a
							href={submitResult.prUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 mt-2 text-sm text-green-700 dark:text-green-300 hover:underline"
						>
							<IconBrandGithub size={16} />
							{s('contribute.viewPr')}
							<IconExternalLink size={14} />
						</a>
					{/if}
					<p class="mt-2 text-xs text-green-700/70 dark:text-green-300/70">
						{s('contribute.reviewNote')}
					</p>
					<button
						onclick={onReset}
						class="block mt-3 text-sm text-accent-links hover:underline"
					>
						{s('contribute.submitAnother')}
					</button>
				</div>
			</div>
		</div>

	{:else if submitResult?.type === 'manual' && submitResult.snippet}
		<!-- Manual mode: show instructions + snippet -->
		{@const snippet = submitResult.snippet}
		<div class="space-y-4">
			<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
				<p class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
					{s('contribute.manual.instructions')}
				</p>
				<ol class="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
					{#if snippet.isFullFile}
						<li>{s('contribute.manual.step1Full')}</li>
						<li>{s('contribute.manual.step2Full', { fileName: snippet.fileName })}</li>
					{:else}
						<li>{s('contribute.manual.step1')}</li>
						{#if snippet.isNew}
							<li>{s('contribute.manual.step2New', { fileName: snippet.fileName })}</li>
						{:else}
							<li>{s('contribute.manual.step2Existing', { category: activeCategoryName, fileName: snippet.fileName })}</li>
						{/if}
					{/if}
					<li>{s('contribute.manual.step3')}</li>
				</ol>
			</div>

			<!-- Copyable snippet -->
			<div class="relative">
				<div class="flex items-center justify-between mb-1.5">
					<span class="text-xs font-medium text-primary-400">
						{#if snippet.isFullFile}
							{s('contribute.manual.fullFile', { fileName: snippet.fileName })}
						{:else}
							{s('contribute.manual.addTo', { fileName: snippet.fileName })}
						{/if}
					</span>
					<button
						onclick={() => handleCopy(snippet.content)}
						class="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-600 transition-colors"
					>
						{#if copied}
							<IconCheck size={14} class="text-green-500" />
							{s('contribute.manual.copied')}
						{:else}
							<IconClipboard size={14} />
							{s('contribute.manual.copy')}
						{/if}
					</button>
				</div>
				<pre class="bg-primary-100 dark:bg-primary-800 border border-primary-200 rounded-lg p-3 text-xs text-primary font-mono overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all max-h-96">{snippet.content}</pre>
			</div>

			<!-- Edit on GitHub button -->
			<a
				href={snippet.editUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors
					bg-[#24292f] hover:bg-[#32383f] text-white"
			>
				<IconBrandGithub size={16} />
				{s('contribute.manual.editOnGithub', { fileName: snippet.fileName })}
				<IconExternalLink size={14} />
			</a>

			<button
				onclick={onReset}
				class="block text-sm text-accent-links hover:underline"
			>
				{s('contribute.submitAnother')}
			</button>
		</div>

	{:else if submitResult?.type === 'error'}
		<div role="alert" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
			<div class="flex items-start gap-2">
				<IconCircleX size={20} class="shrink-0 text-red-600 dark:text-red-400" />
				<p class="text-sm text-red-800 dark:text-red-200">
					{submitResult.message}
				</p>
			</div>
		</div>
	{/if}

	{#if !submitResult || submitResult.type === 'error'}
		<!-- Summary -->
		<div class="text-sm text-primary-600 mb-4">
			{#if mode === 'new'}
				{s('contribute.summaryNew', { category: activeCategoryName, count: String(submittableFeeds.length) })}
			{:else}
				{s('contribute.summaryExisting', { count: String(submittableFeeds.length), category: activeCategoryName })}
			{/if}
			{#if errorFeeds.length > 0 && submittableFeeds.length > 0}
				<span class="text-xs text-primary-400">
					{s('contribute.excludedNote', { count: String(errorFeeds.length) })}
				</span>
			{/if}
		</div>

		<div class="flex flex-wrap gap-3">
			<button
				onclick={onSubmit}
				disabled={!canSubmit || isSubmitting}
				class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors
					bg-blue-600 hover:bg-blue-700 disabled:bg-primary-300 text-white disabled:text-primary-400"
			>
				{#if isSubmitting}
					<IconLoader2 size={16} class="animate-spin" />
					{s('contribute.creatingPr')}
				{:else if githubMode === 'manual'}
					<IconBrandGithub size={16} />
					{s('contribute.manual.submit')}
				{:else}
					<IconSend size={16} />
					{s('contribute.createPr')}
				{/if}
			</button>
		</div>

		{#if pendingFeeds.length > 0}
			<p class="mt-2 text-xs text-primary-600">
				{s('contribute.waitingValidation', { count: String(pendingFeeds.length) })}
			</p>
		{/if}

		{#if allErrored}
			<p class="mt-2 text-xs text-red-600 dark:text-red-400">
				{s('contribute.cannotSubmit')}
			</p>
		{/if}
	{/if}
</div>
