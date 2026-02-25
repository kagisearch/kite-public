<script lang="ts">
import {
	IconChevronDown,
	IconChevronUp,
	IconCircleCheck,
	IconCircleX,
	IconClock,
	IconExternalLink,
	IconGitMerge,
} from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import type { ContributionItem } from '$lib/types';

interface Props {
	contributions: ContributionItem[];
}

let { contributions }: Props = $props();

const PREVIEW_COUNT = 3;
let showAll = $state(false);
let expandedId = $state<string | null>(null);

const visibleContributions = $derived(
	showAll ? contributions : contributions.slice(0, PREVIEW_COUNT),
);
const hasMore = $derived(contributions.length > PREVIEW_COUNT);
const hiddenCount = $derived(contributions.length - PREVIEW_COUNT);

const STEPS = ['submitted', 'merged', 'live'] as const;

const STATUS_CONFIG = {
	submitted: { color: 'bg-blue-500', icon: IconClock },
	merged: { color: 'bg-purple-500', icon: IconGitMerge },
	live: { color: 'bg-green-500', icon: IconCircleCheck },
	declined: { color: 'bg-red-500', icon: IconCircleX },
} as const;

function getStepState(
	step: (typeof STEPS)[number],
	status: ContributionItem['pipelineStatus'],
): 'completed' | 'current' | 'pending' | 'declined' {
	if (status === 'declined') {
		return step === 'submitted' ? 'declined' : 'pending';
	}
	const statusIndex = STEPS.indexOf(status as (typeof STEPS)[number]);
	const stepIndex = STEPS.indexOf(step);
	if (stepIndex < statusIndex) return 'completed';
	if (stepIndex === statusIndex) return 'current';
	return 'pending';
}

function toggleExpanded(id: string) {
	expandedId = expandedId === id ? null : id;
}

function formatRelativeDate(date: Date): string {
	const now = Date.now();
	const diff = now - new Date(date).getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days === 1) return s('time.relative.oneDay') || '1 day ago';
	if (days > 0) return s('time.relative.days', { count: String(days) }) || `${days} days ago`;
	if (hours === 1) return s('time.relative.oneHour') || '1 hour ago';
	if (hours > 0) return s('time.relative.hours', { count: String(hours) }) || `${hours} hours ago`;
	if (minutes === 1) return s('time.relative.oneMinute') || '1 minute ago';
	if (minutes > 0)
		return s('time.relative.minutes', { count: String(minutes) }) || `${minutes} minutes ago`;
	return s('time.relative.justNow') || 'just now';
}
</script>

<div class="bg-modal-bg rounded-lg border border-primary-200 p-4">
	<h2 class="text-sm font-semibold text-primary mb-3">
		{s('contribute.history.titleWithCount', { count: String(contributions.length) })}
	</h2>

	<div class="space-y-1.5">
		{#each visibleContributions as contribution (contribution.id)}
			{@const config = STATUS_CONFIG[contribution.pipelineStatus]}
			{@const isExpanded = expandedId === contribution.id}
			<div class="rounded-md bg-primary-50 overflow-hidden">
				<!-- Compact row -->
				<button
					onclick={() => toggleExpanded(contribution.id)}
					aria-expanded={isExpanded}
					class="w-full flex items-center gap-2.5 py-2 px-2.5 text-sm text-left hover:bg-primary-100 transition-colors"
				>
					<!-- Status dot -->
					<div
						class="w-2 h-2 rounded-full {config.color} shrink-0"
					></div>

					<!-- Category -->
					<span class="font-medium text-primary truncate min-w-0">
						{contribution.category}
					</span>

					<!-- Status label -->
					<span class="shrink-0 text-xs {contribution.pipelineStatus === 'declined' ? 'text-red-500' : 'text-primary-500'}">
						{s(`contribute.history.status.${contribution.pipelineStatus}`)}
					</span>

					<!-- Spacer -->
					<div class="flex-1"></div>

					<!-- Date -->
					<span class="shrink-0 text-xs text-primary-400">
						{formatRelativeDate(contribution.createdAt)}
					</span>

					<!-- Chevron -->
					{#if isExpanded}
						<IconChevronUp size={14} class="shrink-0 text-primary-400" />
					{:else}
						<IconChevronDown size={14} class="shrink-0 text-primary-400" />
					{/if}
				</button>

				<!-- Expanded detail -->
				{#if isExpanded}
					<div class="px-3 pb-3 pt-1 border-t border-primary-200">
						<!-- Meta row -->
						<div class="flex items-center gap-2 text-xs text-primary-500 mb-3">
							<span>
								{s('contribute.history.feedsAdded', { count: String(contribution.feedCount) })}
							</span>
							<span class="text-primary-300">&middot;</span>
							{#if contribution.isNew}
								<span>{s('contribute.history.typeNew')}</span>
							{:else}
								<span>{s('contribute.history.typeExisting')}</span>
							{/if}
							<span class="text-primary-300">&middot;</span>
							<a
								href={contribution.prUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 text-accent-links hover:underline"
							>
								{s('contribute.history.pr', { number: String(contribution.prNumber) })}
								<IconExternalLink size={11} />
							</a>
						</div>

						<!-- Decline reason -->
						{#if contribution.pipelineStatus === 'declined' && contribution.declineReason}
							<div class="mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
								<p class="text-xs text-red-700 dark:text-red-300">
									<span class="font-medium">{s('contribute.history.declineReason')}:</span>
									{contribution.declineReason}
								</p>
							</div>
						{/if}

						<!-- Pipeline stepper -->
						<div class="flex items-start">
							{#each STEPS as step, i}
								{@const state = contribution.pipelineStatus === 'declined'
									? (step === 'submitted' ? 'declined' : 'pending')
									: getStepState(step, contribution.pipelineStatus)}
								<!-- Connector -->
								{#if i > 0}
									<div class="flex-1 h-0.5 mt-3 {state === 'pending'
										? 'bg-primary-200'
										: contribution.pipelineStatus === 'declined'
											? 'bg-primary-200'
											: 'bg-green-400 dark:bg-green-600'}"></div>
								{/if}
								<!-- Step: circle + label stacked -->
								<div class="flex flex-col items-center" style="min-width: 3rem;">
									<Tooltip text={s(`contribute.history.status.${contribution.pipelineStatus === 'declined' && step === 'submitted' ? 'declined' : step}.tooltip`) || ''}>
										{#if state === 'declined'}
											<div class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
												<IconCircleX size={13} class="text-white" />
											</div>
										{:else if state === 'completed'}
											<div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
												<IconCircleCheck size={13} class="text-white" />
											</div>
										{:else if state === 'current' && step === 'submitted'}
											<div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
												<IconClock size={13} class="text-white" />
											</div>
										{:else if state === 'current' && step === 'merged'}
											<div class="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
												<IconGitMerge size={13} class="text-white" />
											</div>
										{:else if state === 'current' && step === 'live'}
											<div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
												<IconCircleCheck size={13} class="text-white" />
											</div>
										{:else}
											<div class="w-6 h-6 rounded-full border-2 border-primary-300"></div>
										{/if}
									</Tooltip>
									<span
										class="mt-1 text-[10px] font-medium
											{state === 'declined'
											? 'text-red-500'
											: state === 'pending'
												? 'text-primary-400'
												: state === 'completed'
													? 'text-green-600 dark:text-green-400'
													: 'text-primary'}"
									>
										{#if contribution.pipelineStatus === 'declined' && step === 'submitted'}
											{s('contribute.history.status.declined')}
										{:else}
											{s(`contribute.history.status.${step}`)}
										{/if}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if hasMore}
		<button
			onclick={() => showAll = !showAll}
			class="mt-2.5 text-xs text-accent-links hover:underline inline-flex items-center gap-1"
		>
			{#if showAll}
				{s('contribute.history.showLess')}
				<IconChevronUp size={13} />
			{:else}
				{s('contribute.history.viewAll', { count: String(hiddenCount) })}
				<IconChevronDown size={13} />
			{/if}
		</button>
	{/if}
</div>
