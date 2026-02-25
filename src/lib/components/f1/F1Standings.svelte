<script lang="ts">
import {
	IconChevronDown,
	IconChevronUp,
	IconLoader2,
	IconRefresh,
	IconTrophy,
} from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { s } from '$lib/client/localization.svelte';

interface DriverStanding {
	position: number;
	points: number;
	wins: number;
	driver: {
		name: string;
		code: string;
		number: string;
		nationality: string;
	};
	constructor: {
		name: string;
		nationality: string;
	};
}

interface ConstructorStanding {
	position: number;
	points: number;
	wins: number;
	constructor: {
		name: string;
		nationality: string;
	};
}

interface StandingsData {
	season: string;
	drivers: DriverStanding[];
	constructors: ConstructorStanding[];
}

let loading = $state(true);
let data: StandingsData | null = $state(null);
let error: string | null = $state(null);
let expanded = $state(false);
let refreshing = $state(false);

async function fetchStandings() {
	try {
		const response = await fetch('/api/widgets/f1/standings');
		if (response.ok) {
			const result = await response.json();
			data = result.data;
			error = null;
		} else {
			error = 'Failed to load standings';
		}
	} catch (err) {
		console.error('Failed to fetch F1 standings:', err);
		error = 'Failed to load standings';
	} finally {
		loading = false;
		refreshing = false;
	}
}

async function handleRefresh() {
	refreshing = true;
	await fetchStandings();
}

const summaryText = $derived.by(() => {
	if (!data) return s('f1.standings.loading');
	return `${data.drivers.length} ${s('f1.drivers')} • ${data.constructors.length} ${s('f1.constructors')}`;
});

// Get top 3 drivers for preview
const topDrivers = $derived.by(() => {
	if (!data) return [];
	return data.drivers.slice(0, 3);
});

onMount(() => {
	fetchStandings();
	// Refresh every 5 minutes
	const interval = setInterval(fetchStandings, 300000);
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
			<IconTrophy class="h-4 w-4 text-gray-600 dark:text-gray-400" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-100">{s('f1.standings.title')}</span>
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
				aria-label={s('f1.standings.title')}
			>
				<IconRefresh class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			</button>
		{/if}
	</div>

	<!-- Collapsed Preview - Top 3 Drivers -->
	{#if !expanded && topDrivers.length > 0}
		<div class="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
			<div class="space-y-1">
				{#each topDrivers as driver, index}
					<div class="flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<span class="text-gray-600 dark:text-gray-400">{index + 1}.</span>
							<span class="font-medium text-gray-900 dark:text-gray-100">{driver.driver.name}</span>
							<span class="text-gray-500 dark:text-gray-500">{driver.driver.code}</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-gray-600 dark:text-gray-400">{driver.wins} {s('f1.wins')}</span>
							<span class="min-w-[2rem] text-right font-bold text-gray-900 dark:text-gray-100">{driver.points} {s('f1.points')}</span>
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
				<!-- Driver Standings -->
				<div class="p-4">
					<h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
						{s('f1.driverStandings')}
					</h3>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead class="border-b border-gray-200 dark:border-gray-700">
								<tr class="text-left text-xs text-gray-600 dark:text-gray-400">
									<th class="pb-2 pr-4">{s('f1.position')}</th>
									<th class="pb-2 pr-4">{s('f1.driver')}</th>
									<th class="pb-2 pr-4">{s('f1.team')}</th>
									<th class="pb-2 pr-4 text-right">{s('f1.points')}</th>
									<th class="pb-2 text-right">{s('f1.wins')}</th>
								</tr>
							</thead>
							<tbody>
								{#each data.drivers as driver}
									<tr class="border-b border-gray-100 last:border-0 dark:border-gray-700/50">
										<td class="py-2 pr-4">
											<span
												class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold {driver.position <=
												3
													? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
													: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}"
											>
												{driver.position}
											</span>
										</td>
										<td class="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">
											<div class="flex items-center gap-2">
												<span>{driver.driver.name}</span>
												<span class="text-xs text-gray-500 dark:text-gray-400">
													{driver.driver.code}
												</span>
											</div>
										</td>
										<td class="py-2 pr-4 text-gray-600 dark:text-gray-400">
											{driver.constructor.name}
										</td>
										<td class="py-2 pr-4 text-right font-semibold text-gray-900 dark:text-gray-100">
											{driver.points}
										</td>
										<td class="py-2 text-right text-gray-600 dark:text-gray-400">{driver.wins}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Constructor Standings -->
				<div class="border-t border-gray-200 p-4 dark:border-gray-700">
					<h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
						{s('f1.constructorStandings')}
					</h3>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead class="border-b border-gray-200 dark:border-gray-700">
								<tr class="text-left text-xs text-gray-600 dark:text-gray-400">
									<th class="pb-2 pr-4">{s('f1.position')}</th>
									<th class="pb-2 pr-4">{s('f1.team')}</th>
									<th class="pb-2 pr-4 text-right">{s('f1.points')}</th>
									<th class="pb-2 text-right">{s('f1.wins')}</th>
								</tr>
							</thead>
							<tbody>
								{#each data.constructors as constructor}
									<tr class="border-b border-gray-100 last:border-0 dark:border-gray-700/50">
										<td class="py-2 pr-4">
											<span
												class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold {constructor.position <=
												3
													? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
													: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}"
											>
												{constructor.position}
											</span>
										</td>
										<td class="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">
											{constructor.constructor.name}
										</td>
										<td class="py-2 pr-4 text-right font-semibold text-gray-900 dark:text-gray-100">
											{constructor.points}
										</td>
										<td class="py-2 text-right text-gray-600 dark:text-gray-400">
											{constructor.wins}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
