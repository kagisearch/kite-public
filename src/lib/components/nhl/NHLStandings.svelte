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
	teamId: string;
	teamName: string;
	teamLogo: string;
	divisionName: string;
	conferenceName: string;
	wins: number;
	losses: number;
	otLosses: number;
	points: number;
	gamesPlayed: number;
	goalDifferential: number;
	goalsFor: number;
	goalsAgainst: number;
	pointPctg: number;
	streakCode: string;
	streakCount: number;
	divisionSequence: number;
}

interface Division {
	name: string;
	conference: string;
	teams: Team[];
}

interface StandingsData {
	divisions: Division[];
	lastUpdated: string;
	error?: string;
}

let loading = $state(true);
let data: StandingsData | null = $state(null);
let refreshing = $state(false);
let expanded = $state(false);

async function fetchStandings() {
	try {
		const response = await fetch('/api/widgets/nhl/standings');
		if (response.ok) {
			const result = await response.json();
			data = result;
			console.log('NHL Standings loaded:', result.divisions?.length, 'divisions');
		} else {
			console.error('NHL Standings API error:', response.status);
		}
	} catch (error) {
		console.error('Failed to fetch NHL standings:', error);
	} finally {
		loading = false;
		refreshing = false;
	}
}

async function handleRefresh() {
	refreshing = true;
	await fetchStandings();
}

function getStreakIcon(streakCode: string) {
	if (streakCode === 'W') return IconTrendingUp;
	if (streakCode === 'L') return IconTrendingDown;
	return IconMinus;
}

function getStreakColor(streakCode: string): string {
	if (streakCode === 'W') return 'text-green-600 dark:text-green-400';
	if (streakCode === 'L') return 'text-red-600 dark:text-red-400';
	return 'text-gray-600 dark:text-gray-400';
}

// Get summary of top teams for collapsed view
const summaryText = $derived.by(() => {
	if (!data?.divisions || data.divisions.length === 0) return s('nhl.standings.loading');
	const totalTeams = data.divisions.reduce((acc, div) => acc + div.teams.length, 0);
	return `${data.divisions.length} ${s('nhl.standings.divisions')} • ${totalTeams} ${s('nhl.standings.teams')}`;
});

// Get top 3 teams across all divisions for preview
const topTeams: Team[] = $derived.by(() => {
	if (!data?.divisions) return [];
	const allTeams = data.divisions.flatMap((div) => div.teams);
	return allTeams.sort((a, b) => b.points - a.points).slice(0, 3);
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
			aria-label={expanded ? s('nhl.standings.collapse') || 'Collapse NHL standings' : s('nhl.standings.expand') || 'Expand NHL standings'}
		>
			<IconMedal class="size-4 text-gray-600 dark:text-gray-400" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-100">{s('nhl.standings.title')}</span>
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
				aria-label={s('nhl.standings.refresh')}
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
							{#if team.teamLogo}
								<img src={team.teamLogo} alt="{team.teamId} logo" class="h-4 w-4 object-contain" />
							{/if}
							<span class="font-medium text-gray-900 dark:text-gray-100">{team.teamId}</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-gray-600 dark:text-gray-400">{team.wins}-{team.losses}-{team.otLosses}</span>
							<span class="min-w-[2rem] text-right font-bold text-gray-900 dark:text-gray-100">{team.points} {s('nhl.standings.points')}</span>
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
					<p>{s('nhl.standings.error')}</p>
				</div>
			{:else if !data?.divisions || data.divisions.length === 0}
				<div class="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
					<p>{s('nhl.standings.noData')}</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					{#each data.divisions as division}
						<div class="border-b border-gray-200 last:border-b-0 dark:border-gray-700">
							<!-- Division Header -->
							<div class="bg-gray-100 px-4 py-2 dark:bg-gray-700">
								<span class="text-xs font-semibold text-gray-900 dark:text-gray-100">
									{division.name}
								</span>
								<span class="ml-2 text-xs text-gray-600 dark:text-gray-400">
									({division.conference})
								</span>
							</div>

							<!-- Teams Table -->
							<div class="overflow-x-auto">
								<table class="w-full text-xs">
									<thead class="border-b border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
										<tr>
											<th class="px-3 py-2 text-left font-medium">{s('nhl.standings.header.rank')}</th>
											<th class="px-3 py-2 text-left font-medium">{s('nhl.standings.header.team')}</th>
											<th class="px-2 py-2 text-center font-medium">{s('nhl.standings.header.gp')}</th>
											<th class="px-2 py-2 text-center font-medium">{s('nhl.standings.header.w')}</th>
											<th class="px-2 py-2 text-center font-medium">{s('nhl.standings.header.l')}</th>
											<th class="px-2 py-2 text-center font-medium">{s('nhl.standings.header.ot')}</th>
											<th class="px-2 py-2 text-center font-medium">{s('nhl.standings.header.pts')}</th>
											<th class="px-2 py-2 text-center font-medium hidden sm:table-cell">{s('nhl.standings.header.diff')}</th>
											<th class="px-2 py-2 text-center font-medium">{s('nhl.standings.header.strk')}</th>
										</tr>
									</thead>
									<tbody class="bg-white dark:bg-gray-800">
										{#each division.teams as team, index}
											{@const StreakIcon = getStreakIcon(team.streakCode)}
											<tr class="border-t border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
												<td class="px-3 py-2 text-gray-700 dark:text-gray-300">{index + 1}</td>
												<td class="px-3 py-2">
													<div class="flex items-center gap-2">
														{#if team.teamLogo}
															<img src={team.teamLogo} alt="{team.teamId} logo" class="h-5 w-5 object-contain" />
														{/if}
														<span class="font-medium text-gray-900 dark:text-gray-100">
															{team.teamId}
														</span>
													</div>
												</td>
												<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300">{team.gamesPlayed}</td>
												<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300">{team.wins}</td>
												<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300">{team.losses}</td>
												<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300">{team.otLosses}</td>
												<td class="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100">{team.points}</td>
												<td class="px-2 py-2 text-center text-gray-700 dark:text-gray-300 hidden sm:table-cell">
													<span class="{team.goalDifferential > 0 ? 'text-green-600 dark:text-green-400' : team.goalDifferential < 0 ? 'text-red-600 dark:text-red-400' : ''}">
														{team.goalDifferential > 0 ? '+' : ''}{team.goalDifferential}
													</span>
												</td>
												<td class="px-2 py-2 text-center">
													<div class="flex items-center justify-center gap-1 {getStreakColor(team.streakCode)}">
														<StreakIcon class="h-3 w-3" />
														<span class="font-medium">{team.streakCount}</span>
													</div>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/each}
				</div>

				<!-- Legend -->
				<div class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
					<div class="flex flex-wrap gap-x-3 gap-y-1">
						<span><strong>{s('nhl.standings.header.gp')}:</strong> {s('nhl.standings.legend.gp')}</span>
						<span><strong>{s('nhl.standings.header.w')}:</strong> {s('nhl.standings.legend.w')}</span>
						<span><strong>{s('nhl.standings.header.l')}:</strong> {s('nhl.standings.legend.l')}</span>
						<span><strong>{s('nhl.standings.header.ot')}:</strong> {s('nhl.standings.legend.ot')}</span>
						<span><strong>{s('nhl.standings.header.pts')}:</strong> {s('nhl.standings.legend.pts')}</span>
						<span class="hidden sm:inline"><strong>{s('nhl.standings.header.diff')}:</strong> {s('nhl.standings.legend.diff')}</span>
						<span><strong>{s('nhl.standings.header.strk')}:</strong> {s('nhl.standings.legend.strk')}</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
