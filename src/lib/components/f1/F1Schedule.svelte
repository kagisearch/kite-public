<script lang="ts">
import { onMount } from 'svelte';
import { IconChevronDown, IconChevronUp, IconFlag, IconRefresh, IconLoader2 } from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';

interface Race {
	round: number;
	name: string;
	circuit: {
		name: string;
		location: string;
		country: string;
	};
	date: string;
	time?: string;
	status: 'completed' | 'upcoming' | 'live';
	winner?: {
		name: string;
		constructor: string;
	};
}

interface ScheduleData {
	season: string;
	races: Race[];
	nextRace?: Race;
	lastRace?: Race;
}

let loading = $state(true);
let data: ScheduleData | null = $state(null);
let error: string | null = $state(null);
let expanded = $state(false);
let refreshing = $state(false);

async function fetchSchedule() {
	try {
		const response = await fetch('/api/widgets/f1/schedule');
		if (response.ok) {
			const result = await response.json();
			data = result.data;
			error = null;
		} else {
			error = 'Failed to load schedule';
		}
	} catch (err) {
		console.error('Failed to fetch F1 schedule:', err);
		error = 'Failed to load schedule';
	} finally {
		loading = false;
		refreshing = false;
	}
}

async function handleRefresh() {
	refreshing = true;
	await fetchSchedule();
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysUntil(dateStr: string, timeStr?: string): number {
	// timeStr already includes 'Z' from API (e.g., "04:00:00Z")
	// If no time provided, use default UTC time
	const timeWithZ = timeStr || '14:00:00Z';
	const raceDate = new Date(`${dateStr}T${timeWithZ}`);
	const now = new Date();
	const diff = raceDate.getTime() - now.getTime();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const summaryText = $derived.by(() => {
	if (!data) return s('f1.schedule.loading');
	if (data.nextRace) {
		const daysUntil = getDaysUntil(data.nextRace.date, data.nextRace.time);
		if (daysUntil === 0) return s('f1.schedule.today');
		if (daysUntil === 1) return s('f1.schedule.tomorrow');
		return s('f1.schedule.inDays', { days: daysUntil.toString() });
	}
	return s('f1.schedule.seasonComplete');
});

// Get upcoming races for preview (next 3)
const upcomingRaces = $derived.by(() => {
	if (!data?.races) return [];
	return data.races.filter(r => r.status === 'upcoming').slice(0, 3);
});

onMount(() => {
	fetchSchedule();
	// Refresh every 5 minutes
	const interval = setInterval(fetchSchedule, 300000);
	return () => clearInterval(interval);
});
</script>

<div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
	<!-- Header - Always visible -->
	<div class="flex w-full items-center justify-between px-4 py-3">
		<button
			onclick={() => (expanded = !expanded)}
			class="flex flex-1 items-center gap-2 text-left transition-colors hover:opacity-80"
		>
			<IconFlag class="h-4 w-4 text-gray-600 dark:text-gray-400" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-100">{s('f1.schedule.title')}</span>
			<span class="text-xs text-gray-600 dark:text-gray-400">{summaryText}</span>
			{#if expanded}
				<IconChevronUp class="ml-auto h-5 w-5 text-gray-600 dark:text-gray-400" />
			{:else}
				<IconChevronDown class="ml-auto h-5 w-5 text-gray-600 dark:text-gray-400" />
			{/if}
		</button>
		{#if !loading}
			<button
				onclick={handleRefresh}
				disabled={refreshing}
				class="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
				aria-label={s('f1.schedule.title')}
			>
				<IconRefresh class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			</button>
		{/if}
	</div>

	<!-- Collapsed Preview - Next 3 Races -->
	{#if !expanded && upcomingRaces.length > 0}
		<div class="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
			<div class="space-y-1">
				{#each upcomingRaces as race}
					{@const daysUntil = getDaysUntil(race.date, race.time)}
					{@const isNext = race.round === data?.nextRace?.round}
					<div class="flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							{#if isNext}
								<span class="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
									{s('f1.nextRace')}
								</span>
							{/if}
							<span class="font-medium text-gray-900 dark:text-gray-100">{race.name}</span>
						</div>
						<div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
							<span>{formatDate(race.date)}</span>
							{#if daysUntil > 0}
								<span>
									{#if daysUntil === 0}
										{s('f1.today')}
									{:else if daysUntil === 1}
										{s('f1.tomorrow')}
									{:else}
										{daysUntil} {s('f1.days')}
									{/if}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Expanded Content -->
	{#if expanded}
		<div class="border-t border-gray-200 dark:border-gray-700">
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<IconLoader2 class="h-6 w-6 animate-spin text-gray-600 dark:text-gray-400" />
				</div>
			{:else if error}
				<div class="p-8 text-center text-red-600 dark:text-red-400">{error}</div>
			{:else if data}
				<div class="p-4">
					<div class="space-y-2">
						{#each data.races as race}
							{@const isNext = race.round === data.nextRace?.round}
							{@const isLast = race.round === data.lastRace?.round}

							<div
								class="rounded-lg border p-3 {isNext
									? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
									: 'border-gray-200 dark:border-gray-700'}"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<span class="text-xs font-semibold text-gray-500 dark:text-gray-400">
												{s('f1.round')} {race.round}
											</span>
											{#if isNext}
												<span
													class="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
												>
													{s('f1.nextRace')}
												</span>
											{/if}
										</div>
										<div class="mt-1 font-semibold text-gray-900 dark:text-gray-100">
											{race.name}
										</div>
										<div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
											{race.circuit.location}, {race.circuit.country}
										</div>
										{#if race.winner}
											<div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
												<span class="font-medium">{s('f1.winner')}:</span>
												{race.winner.name}
												<span class="text-gray-500 dark:text-gray-500">({race.winner.constructor})</span>
											</div>
										{/if}
									</div>
									<div class="text-right">
										<div class="font-semibold text-gray-900 dark:text-gray-100">
											{formatDate(race.date)}
										</div>
										{#if race.status === 'upcoming'}
											{@const days = getDaysUntil(race.date, race.time)}
											<div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
												{#if days <= 0}
													{s('f1.today')}
												{:else if days === 1}
													{s('f1.tomorrow')}
												{:else}
													{days} {s('f1.days')}
												{/if}
											</div>
										{:else}
											<div class="mt-1 text-sm text-gray-500 dark:text-gray-500">
												{s('f1.completed')}
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
