<script lang="ts">
import { onMount } from 'svelte';
import { IconChevronDown, IconChevronUp, IconLoader2, IconRefresh, IconTrophy } from '@tabler/icons-svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import { s } from '$lib/client/localization.svelte';
import { language } from '$lib/stores/language.svelte.js';

interface Team {
	id: number;
	abbrev: string;
	name: string;
	placeName?: string;
	commonName?: string;
	logo: string;
	score?: number;
}

interface Game {
	id: number;
	state: string;
	startTime: string;
	homeTeam: Team;
	awayTeam: Team;
	period?: number;
	periodType?: string;
	clock?: string;
}

interface ScoresData {
	games: Game[];
	lastUpdated: string;
	error?: string;
}

interface GameOdds {
	gameId: number;
	homeTeam: string;
	awayTeam: string;
	moneyline?: {
		home: number;
		away: number;
		volume?: number;
		liquidity?: number;
		tokenIds?: string[];
	};
	overUnder?: {
		line: number;
		over: number;
		under: number;
	};
}

interface PolymarketData {
	odds: GameOdds[];
	lastUpdated: string;
	error?: string;
}

let loading = $state(true);
let data: ScoresData | null = $state(null);
let oddsData: PolymarketData | null = $state(null);
let refreshing = $state(false);
let expanded = $state(false);

async function fetchScores() {
	try {
		const response = await fetch('/api/widgets/nhl/scores');
		if (response.ok) {
			const result = await response.json();
			data = result;
			console.log('NHL Scores loaded:', result.games?.length, 'games');
		} else {
			console.error('NHL Scores API error:', response.status);
		}
	} catch (error) {
		console.error('Failed to fetch NHL scores:', error);
	} finally {
		loading = false;
		refreshing = false;
	}
}

async function fetchOdds() {
	try {
		const response = await fetch('/api/widgets/nhl/polymarket');
		if (response.ok) {
			const result = await response.json();
			oddsData = result;
			console.log('Polymarket odds loaded:', result.odds?.length, 'games');
		} else {
			console.error('Polymarket API error:', response.status);
		}
	} catch (error) {
		console.error('Failed to fetch Polymarket odds:', error);
	}
}

// Helper to match team by checking place name and common name in the Polymarket full name
function matchesTeam(team: Team, polymarketName: string): boolean {
	if (!polymarketName) return false;
	const lowerPolyName = polymarketName.toLowerCase();

	// Check if place name (e.g., "Carolina") is in Polymarket name
	if (team.placeName && lowerPolyName.includes(team.placeName.toLowerCase())) {
		return true;
	}

	// Check if common name (e.g., "Hurricanes") is in Polymarket name
	if (team.commonName && lowerPolyName.includes(team.commonName.toLowerCase())) {
		return true;
	}

	// Fallback: check if the generic name is in Polymarket name
	if (team.name && lowerPolyName.includes(team.name.toLowerCase())) {
		return true;
	}

	return false;
}

// Helper to get odds for a specific game by matching team names
// Takes oddsData as parameter to make it reactive
function getOddsForGame(game: Game, odds: PolymarketData | null): GameOdds | undefined {
	if (!odds?.odds) return undefined;

	const match = odds.odds.find(o => {
		const homeMatch = matchesTeam(game.homeTeam, o.homeTeam);
		const awayMatch = matchesTeam(game.awayTeam, o.awayTeam);

		if (homeMatch && awayMatch) {
			console.log(`✓ Matched: ${game.awayTeam.name} @ ${game.homeTeam.name} with ${o.awayTeam} @ ${o.homeTeam}`);
		}

		return homeMatch && awayMatch;
	});

	if (!match) {
		console.log(`✗ No match for: ${game.awayTeam.name} @ ${game.homeTeam.name}`);
	}

	return match;
}

// Format odds as percentage
function formatOdds(odds: number): string {
	return `${Math.round(odds * 100)}%`;
}

// Format currency for tooltips
function formatCurrency(amount: number): string {
	if (amount >= 1000000) {
		return `$${(amount / 1000000).toFixed(1)}M`;
	} else if (amount >= 1000) {
		return `$${(amount / 1000).toFixed(0)}K`;
	}
	return `$${amount.toFixed(0)}`;
}

// Generate tooltip text for odds
function getOddsTooltip(odds: GameOdds): string {
	if (!odds.moneyline) return '';
	const parts = [];
	if (odds.moneyline.volume) {
		parts.push(`${s('nhl.volume')}: ${formatCurrency(odds.moneyline.volume)}`);
	}
	if (odds.moneyline.liquidity) {
		parts.push(`${s('nhl.liquidity')}: ${formatCurrency(odds.moneyline.liquidity)}`);
	}
	return parts.join(' • ');
}

async function handleRefresh() {
	refreshing = true;
	await Promise.all([fetchScores(), fetchOdds()]);
}

function formatGameTime(startTime: string): string {
	const date = new Date(startTime);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const gameDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.floor((gameDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	const timeStr = date.toLocaleTimeString(language.currentLocale, {
		hour: 'numeric',
		minute: '2-digit'
	});

	if (diffDays === 0) {
		// Today - show time only
		return timeStr;
	} else if (diffDays === 1) {
		// Tomorrow
		return `${s('nhl.tomorrow')} ${timeStr}`;
	} else if (diffDays > 1 && diffDays <= 7) {
		// This week - show day name
		return date.toLocaleDateString(language.currentLocale, {
			weekday: 'short',
			hour: 'numeric',
			minute: '2-digit'
		});
	} else {
		// Further out - show full date
		return date.toLocaleDateString(language.currentLocale, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
}

function getGameStatus(game: Game): string {
	if (game.state === 'LIVE' || game.state === 'CRIT') {
		if (game.periodType === 'SO') return s('nhl.shootout');
		if (game.periodType === 'OT') return s('nhl.overtime');
		return s('nhl.period', { period: (game.period || '').toString() });
	}
	if (game.state === 'FUT' || game.state === 'PRE') {
		return formatGameTime(game.startTime);
	}
	if (game.state === 'FINAL') {
		if (game.periodType === 'SO') return s('nhl.finalShootout');
		if (game.periodType === 'OT') return s('nhl.finalOvertime');
		return s('nhl.final');
	}
	return game.state;
}

function isLive(game: Game): boolean {
	return game.state === 'LIVE' || game.state === 'CRIT';
}

// Get summary text for collapsed view
const summaryText = $derived.by(() => {
	if (!data?.games || data.games.length === 0) return s('nhl.noGames');
	const liveCount = data.games.filter(isLive).length;
	const finalCount = data.games.filter(g => g.state === 'FINAL' || g.state === 'OFF').length;
	const upcomingCount = data.games.filter(g => g.state === 'FUT' || g.state === 'PRE').length;

	if (liveCount > 0) {
		const liveText = s('nhl.gamesCount', { count: liveCount.toString() });
		const totalText = s('nhl.gamesCount', { count: data.games.length.toString() });
		return `${liveText} ${s('nhl.live')} • ${totalText} ${s('nhl.total')}`;
	} else if (upcomingCount > 0 && finalCount === 0) {
		return upcomingCount === 1
			? s('nhl.gamesCount', { count: upcomingCount.toString() })
			: s('nhl.gamesCountPlural', { count: upcomingCount.toString() });
	} else if (finalCount > 0 && upcomingCount === 0) {
		const completedText = finalCount === 1
			? s('nhl.gamesCount', { count: finalCount.toString() })
			: s('nhl.gamesCountPlural', { count: finalCount.toString() });
		return `${completedText} ${s('nhl.completed')}`;
	} else {
		const completedText = finalCount === 1
			? s('nhl.gamesCount', { count: finalCount.toString() })
			: s('nhl.gamesCountPlural', { count: finalCount.toString() });
		const upcomingText = upcomingCount === 1
			? s('nhl.gamesCount', { count: upcomingCount.toString() })
			: s('nhl.gamesCountPlural', { count: upcomingCount.toString() });
		return `${completedText} ${s('nhl.completed')} • ${upcomingText} ${s('nhl.upcoming')}`;
	}
});

// Show max 3 games in collapsed view
const collapsedGames = $derived.by((): Game[] => {
	return (data?.games || []).slice(0, 3);
});

onMount(() => {
	fetchScores();
	fetchOdds();
	// Refresh scores every 30 seconds for live games, odds every 5 minutes
	const scoresInterval = setInterval(fetchScores, 30000);
	const oddsInterval = setInterval(fetchOdds, 300000);
	return () => {
		clearInterval(scoresInterval);
		clearInterval(oddsInterval);
	};
});
</script>

<div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
	<!-- Header - Always visible -->
	<div class="flex w-full items-center justify-between px-4 py-3">
		<button
			onclick={() => expanded = !expanded}
			class="flex flex-1 items-center gap-2 text-left transition-colors hover:opacity-80"
		>
			<IconTrophy class="h-4 w-4 text-gray-600 dark:text-gray-400" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-100">{s('nhl.title')}</span>
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
				aria-label={s('nhl.refresh')}
			>
				<IconRefresh class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			</button>
		{/if}
	</div>

	<!-- Collapsed Preview -->
	{#if !expanded && data?.games && data.games.length > 0}
		<div class="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
			<div class="flex gap-3 overflow-x-auto">
				{#each collapsedGames as game (game.id)}
					{#key `${game.id}-${oddsData?.lastUpdated || 'no-odds'}`}
						{@const live = isLive(game)}
						{@const odds = getOddsForGame(game, oddsData)}
						<div class="flex min-w-[140px] flex-col gap-1 rounded border border-gray-200 bg-white p-2 text-xs dark:border-gray-600 dark:bg-gray-800">
							<div class="flex items-center justify-between gap-1">
								<div class="flex items-center gap-1">
									{#if game.awayTeam.logo}
										<img src={game.awayTeam.logo} alt={game.awayTeam.abbrev} class="h-4 w-4 object-contain" />
									{/if}
									<span class="font-medium text-gray-900 dark:text-gray-100">{game.awayTeam.abbrev}</span>
								</div>
								{#if odds?.moneyline}
									<Tooltip text={getOddsTooltip(odds)} position="top">
										<span class="text-[10px] text-gray-600 dark:text-gray-400">{formatOdds(odds.moneyline.away)}</span>
									</Tooltip>
								{:else}
									<span class="text-gray-900 dark:text-gray-100">{game.awayTeam.score ?? '-'}</span>
								{/if}
							</div>
							<div class="flex items-center justify-between gap-1">
								<div class="flex items-center gap-1">
									{#if game.homeTeam.logo}
										<img src={game.homeTeam.logo} alt={game.homeTeam.abbrev} class="h-4 w-4 object-contain" />
									{/if}
									<span class="font-medium text-gray-900 dark:text-gray-100">{game.homeTeam.abbrev}</span>
								</div>
								{#if odds?.moneyline}
									<Tooltip text={getOddsTooltip(odds)} position="top">
										<span class="text-[10px] text-gray-600 dark:text-gray-400">{formatOdds(odds.moneyline.home)}</span>
									</Tooltip>
								{:else}
									<span class="text-gray-900 dark:text-gray-100">{game.homeTeam.score ?? '-'}</span>
								{/if}
							</div>
							<div class="border-t border-gray-200 pt-1 text-center dark:border-gray-600">
								<span class="{live ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}">
									{getGameStatus(game)}
								</span>
							</div>
						</div>
					{/key}
				{/each}
			</div>
			{#if oddsData?.odds && oddsData.odds.length > 0}
				<div class="mt-2 text-center">
					<a
						href="https://polymarket.com/sports/nhl"
						target="_blank"
						rel="noopener noreferrer"
						class="text-[10px] text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
					>
						{s('nhl.oddsFrom')}
					</a>
				</div>
			{/if}
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
					<p>Unable to load scores. Please try again later.</p>
				</div>
			{:else if !data?.games || data.games.length === 0}
				<div class="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
					<p>No games scheduled for today.</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each data.games as game (game.id)}
						{#key `${game.id}-${oddsData?.lastUpdated || 'no-odds'}`}
							{@const live = isLive(game)}
							{@const odds = getOddsForGame(game, oddsData)}
							<div class="px-4 py-3 {live ? 'bg-red-50 dark:bg-red-900/10' : ''}">
								<!-- Away Team -->
								<div class="mb-2 flex items-center justify-between">
									<div class="flex items-center gap-2">
										{#if game.awayTeam.logo}
										<img
											src={game.awayTeam.logo}
											alt="{game.awayTeam.abbrev} logo"
											class="h-6 w-6 object-contain"
										/>
									{/if}
									<span class="text-sm font-medium text-gray-900 dark:text-gray-100">
										{game.awayTeam.abbrev}
									</span>
									{#if odds?.moneyline}
										<span class="ml-auto text-xs text-gray-600 dark:text-gray-400">
											{formatOdds(odds.moneyline.away)}
										</span>
									{/if}
								</div>
								{#if game.awayTeam.score !== undefined}
									<span class="text-lg font-bold text-gray-900 dark:text-gray-100">
										{game.awayTeam.score}
									</span>
								{/if}
							</div>

							<!-- Home Team -->
							<div class="mb-2 flex items-center justify-between">
								<div class="flex items-center gap-2">
									{#if game.homeTeam.logo}
										<img
											src={game.homeTeam.logo}
											alt="{game.homeTeam.abbrev} logo"
											class="h-6 w-6 object-contain"
										/>
									{/if}
									<span class="text-sm font-medium text-gray-900 dark:text-gray-100">
										{game.homeTeam.abbrev}
									</span>
									{#if odds?.moneyline}
										<span class="ml-auto text-xs text-gray-600 dark:text-gray-400">
											{formatOdds(odds.moneyline.home)}
										</span>
									{/if}
								</div>
								{#if game.homeTeam.score !== undefined}
									<span class="text-lg font-bold text-gray-900 dark:text-gray-100">
										{game.homeTeam.score}
									</span>
								{/if}
							</div>

							<!-- Game Status and Over/Under -->
							<div class="flex items-center justify-between text-center">
								<span class="text-xs {live ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}">
									{getGameStatus(game)}
									{#if live && game.clock}
										<span class="ml-1">{game.clock}</span>
									{/if}
								</span>
								<div class="flex flex-col items-end gap-0.5">
									{#if odds?.overUnder && !live}
										<span class="text-xs text-gray-600 dark:text-gray-400">
											{s('nhl.overUnder')} {odds.overUnder.line}: {formatOdds(odds.overUnder.over)} / {formatOdds(odds.overUnder.under)}
										</span>
									{/if}
									{#if odds?.moneyline?.volume}
										<span class="text-[10px] text-gray-500 dark:text-gray-500">
											{s('nhl.volume')}: {formatCurrency(odds.moneyline.volume)}
											{#if odds.moneyline.liquidity}
												• {s('nhl.liquidity')}: {formatCurrency(odds.moneyline.liquidity)}
											{/if}
										</span>
									{/if}
								</div>
							</div>

							</div>
						{/key}
					{/each}
				</div>
				{#if oddsData?.odds && oddsData.odds.length > 0}
					<div class="border-t border-gray-200 px-4 py-2 text-center dark:border-gray-700">
						<a
							href="https://polymarket.com/sports/nhl"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
						>
							{s('nhl.oddsFrom')}
						</a>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
