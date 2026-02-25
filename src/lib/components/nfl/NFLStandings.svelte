<script lang="ts">
import {
	IconChevronDown,
	IconChevronUp,
	IconLoader2,
	IconMedal,
	IconMinus,
	IconRefresh,
	IconTrendingDown,
	IconTrendingUp,
} from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { s } from '$lib/client/localization.svelte';

interface Team {
	id: number;
	abbrev: string;
	name: string;
	logo: string;
	wins: number;
	losses: number;
	ties: number;
	winPercent: number;
	gamesPlayed: number;
	pointsFor: number;
	pointsAgainst: number;
	pointsDifferential: number;
	streak: string;
	divisionRecord: string;
	conferenceRecord: string;
}

interface Division {
	id: string;
	name: string;
	teams: Team[];
}

interface Conference {
	id: string;
	name: string;
	divisions: Division[];
}

interface StandingsData {
	conferences: Conference[];
	lastUpdated: string;
	error?: string;
}

let loading = $state(true);
let data: StandingsData | null = $state(null);
let refreshing = $state(false);
let expanded = $state(false);

async function fetchStandings() {
	try {
		const response = await fetch('/api/widgets/nfl/standings');
		if (response.ok) {
			const result = await response.json();
			data = result;
			console.log('NFL Standings loaded:', result.conferences?.length, 'conferences');
		} else {
			console.error('NFL Standings API error:', response.status);
		}
	} catch (error) {
		console.error('Failed to fetch NFL standings:', error);
	} finally {
		loading = false;
		refreshing = false;
	}
}

async function handleRefresh() {
	refreshing = true;
	await fetchStandings();
}

function getStreakIcon(streak: string) {
	if (streak.startsWith('W')) return IconTrendingUp;
	if (streak.startsWith('L')) return IconTrendingDown;
	return IconMinus;
}

function getStreakColor(streak: string): string {
	if (streak.startsWith('W')) return 'text-green-600 dark:text-green-400';
	if (streak.startsWith('L')) return 'text-red-600 dark:text-red-400';
	return 'text-gray-600 dark:text-gray-400';
}

// Get summary of conferences and teams
const summaryText = $derived.by(() => {
	if (!data?.conferences || data.conferences.length === 0) return s('nfl.standings.loading');
	const totalDivisions = data.conferences.reduce((acc, conf) => acc + conf.divisions.length, 0);
	const totalTeams = data.conferences.reduce(
		(acc, conf) => acc + conf.divisions.reduce((divAcc, div) => divAcc + div.teams.length, 0),
		0,
	);
	return `${data.conferences.length} ${s('nfl.standings.conferences')} • ${totalDivisions} ${s('nfl.standings.divisions')} • ${totalTeams} ${s('nfl.standings.teams')}`;
});

// Get top 3 teams across all divisions for preview
const topTeams: Team[] = $derived.by(() => {
	if (!data?.conferences) return [];
	const allTeams = data.conferences.flatMap((conf) => conf.divisions.flatMap((div) => div.teams));
	return allTeams.sort((a, b) => b.winPercent - a.winPercent).slice(0, 3);
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
			onclick={() => expanded = !expanded}
			class="flex flex-1 items-center gap-2 text-left transition-colors hover:opacity-80"
			aria-expanded={expanded}
			aria-label={expanded ? s('nfl.standings.collapse') || 'Collapse NFL standings' : s('nfl.standings.expand') || 'Expand NFL standings'}
		>
			<IconMedal class="size-4 text-gray-600 dark:text-gray-400" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-100">{s('nfl.standings.title')}</span>
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
				aria-label={s('nfl.standings.refresh')}
			>
				<IconRefresh class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			</button>
		{/if}
	</div>

	<!-- Collapsed Preview - Top 3 Teams -->
	{#if !expanded && topTeams.length > 0}
		<div class="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
			<div class="space-y-1">
				{#each topTeams as team, index}
					<div class="flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<span class="text-gray-600 dark:text-gray-400">{index + 1}.</span>
							{#if team.logo}
								<img src={team.logo} alt="{team.abbrev} logo" class="h-4 w-4 object-contain" />
							{/if}
							<span class="font-medium text-gray-900 dark:text-gray-100">{team.abbrev}</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-gray-600 dark:text-gray-400">{team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}</span>
							<span class="min-w-[2.5rem] text-right font-bold text-gray-900 dark:text-gray-100">{team.winPercent.toFixed(3)}</span>
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
			{:else if data?.error}
				<div class="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
					<p>{s('nfl.standings.noData')}</p>
				</div>
			{:else if !data?.conferences || data.conferences.length === 0}
				<div class="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
					<p>{s('nfl.standings.noData')}</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					{#each data.conferences as conference}
						{#each conference.divisions as division}
							<div class="border-b border-gray-200 last:border-b-0 dark:border-gray-700">
								<!-- Division Header -->
								<div class="bg-gray-100 px-4 py-2 dark:bg-gray-700">
									<span class="text-xs font-semibold text-gray-900 dark:text-gray-100">
										{division.name}
									</span>
									<span class="ml-2 text-xs text-gray-600 dark:text-gray-400">
										({conference.name})
									</span>
								</div>

								<!-- Teams Table -->
								<div class="overflow-x-auto">
									<table class="w-full text-xs">
										<thead class="border-b border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
											<tr>
												<th class="px-3 py-2 text-left font-medium">{s('nfl.standings.header.rank')}</th>
												<th class="px-3 py-2 text-left font-medium">{s('nfl.standings.header.team')}</th>
												<th class="px-2 py-2 text-center font-medium">{s('nfl.standings.header.w')}</th>
												<th class="px-2 py-2 text-center font-medium">{s('nfl.standings.header.l')}</th>
												<th class="px-2 py-2 text-center font-medium">{s('nfl.standings.header.t')}</th>
												<th class="px-2 py-2 text-center font-medium">{s('nfl.standings.header.pct')}</th>
												<th class="px-2 py-2 text-center font-medium hidden sm:table-cell">{s('nfl.standings.header.pf')}</th>
												<th class="px-2 py-2 text-center font-medium hidden sm:table-cell">{s('nfl.standings.header.pa')}</th>
												<th class="px-2 py-2 text-center font-medium hidden sm:table-cell">{s('nfl.standings.header.diff')}</th>
												<th class="px-2 py-2 text-center font-medium">{s('nfl.standings.header.strk')}</th>
											</tr>
										</thead>
										<tbody class="bg-white dark:bg-gray-800">
											{#each division.teams as team, index}
												{@const StreakIcon = getStreakIcon(team.streak)}
												<tr class="border-t border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
													<td class="px-3 py-2 text-gray-700 dark:text-gray-300">{index + 1}</td>
													<td class="px-3 py-2">
														<div class="flex items-center gap-2">
															{#if team.logo}
																<img src={team.logo} alt="{team.abbrev} logo" class="h-5 w-5 object-contain" />
															{/if}
															<span class="font-medium text-gray-900 dark:text-gray-100">
																{team.abbrev}
															</span>
														</div>
													</td>
													<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300">{team.wins}</td>
													<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300">{team.losses}</td>
													<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300">{team.ties}</td>
													<td class="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100">{team.winPercent.toFixed(3)}</td>
													<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300 hidden sm:table-cell">{team.pointsFor}</td>
													<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300 hidden sm:table-cell">{team.pointsAgainst}</td>
													<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300 hidden sm:table-cell">
														<span class="{team.pointsDifferential > 0 ? 'text-green-600 dark:text-green-400' : team.pointsDifferential < 0 ? 'text-red-600 dark:text-red-400' : ''}">
															{team.pointsDifferential > 0 ? '+' : ''}{team.pointsDifferential}
														</span>
													</td>
													<td class="px-2 py-2 text-center">
														<div class="flex items-center justify-center gap-1 {getStreakColor(team.streak)}">
															<StreakIcon class="h-3 w-3" />
															<span class="font-medium">{team.streak}</span>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/each}
					{/each}
				</div>

				<!-- Legend -->
				<div class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
					<div class="flex flex-wrap gap-x-3 gap-y-1">
						<span><strong>{s('nfl.standings.header.w')}:</strong> {s('nfl.standings.legend.w')}</span>
						<span><strong>{s('nfl.standings.header.l')}:</strong> {s('nfl.standings.legend.l')}</span>
						<span><strong>{s('nfl.standings.header.t')}:</strong> {s('nfl.standings.legend.t')}</span>
						<span><strong>{s('nfl.standings.header.pct')}:</strong> {s('nfl.standings.legend.pct')}</span>
						<span class="hidden sm:inline"><strong>{s('nfl.standings.header.pf')}:</strong> {s('nfl.standings.legend.pf')}</span>
						<span class="hidden sm:inline"><strong>{s('nfl.standings.header.pa')}:</strong> {s('nfl.standings.legend.pa')}</span>
						<span class="hidden sm:inline"><strong>{s('nfl.standings.header.diff')}:</strong> {s('nfl.standings.legend.diff')}</span>
						<span><strong>{s('nfl.standings.header.strk')}:</strong> {s('nfl.standings.legend.strk')}</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
