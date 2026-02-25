<script lang="ts">
import { IconRefresh, IconTrendingDown, IconTrendingUp } from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { s } from '$lib/client/localization.svelte';

interface CryptoConfig {
	id: string;
	color: string;
}

// Popular cryptocurrencies to display
const cryptos: CryptoConfig[] = [
	{ id: 'bitcoin', color: 'bg-orange-500' },
	{ id: 'ethereum', color: 'bg-purple-500' },
	{ id: 'binancecoin', color: 'bg-yellow-500' },
	{ id: 'solana', color: 'bg-green-500' },
	{ id: 'ripple', color: 'bg-blue-500' },
	{ id: 'cardano', color: 'bg-indigo-500' },
	{ id: 'avalanche-2', color: 'bg-red-500' },
	{ id: 'polkadot', color: 'bg-pink-500' },
];

interface PriceData {
	id: string;
	symbol: string;
	name: string;
	price: number;
	priceChangePercentage24h: number;
	sparkline: number[];
}

let loading = $state(true);
let data: Map<string, PriceData> = $state(new Map());
let refreshing = $state(false);

async function fetchPrices() {
	try {
		const newData = new Map<string, PriceData>();

		// Fetch all in parallel - DIA API has no rate limits
		const promises = cryptos.map(async (crypto) => {
			try {
				const response = await fetch(`/api/widgets/crypto/price?id=${crypto.id}`);
				if (response.ok) {
					const result = await response.json();
					if (result?.data) {
						return [crypto.id, result.data] as const;
					}
				}
			} catch (err) {
				console.error(`Failed to fetch ${crypto.id}:`, err);
			}
			return null;
		});

		const results = await Promise.all(promises);

		// Update data with all results
		results.forEach((result) => {
			if (result) {
				newData.set(result[0], result[1]);
			}
		});

		data = newData;
	} finally {
		loading = false;
		refreshing = false;
	}
}

async function handleRefresh() {
	refreshing = true;
	await fetchPrices();
}

// Format price with appropriate decimals
function formatPrice(price: number): string {
	const decimals = price < 1 ? 4 : price < 100 ? 2 : 0;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(price);
}

// Generate SVG path for sparkline
function generateSparklinePath(prices: number[]): string {
	if (!prices || prices.length === 0) return '';

	const width = 60;
	const height = 20;
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min || 1;

	const points = prices.map((price, index) => {
		const x = (index / (prices.length - 1)) * width;
		const y = height - ((price - min) / range) * height;
		return `${x},${y}`;
	});

	return `M ${points.join(' L ')}`;
}

// Symbol mapping for cryptocurrency-icons library
const symbolMap: Record<string, string> = {
	bitcoin: 'btc',
	ethereum: 'eth',
	binancecoin: 'bnb',
	solana: 'sol',
	ripple: 'xrp',
	cardano: 'ada',
	'avalanche-2': 'avax',
	polkadot: 'dot',
};

onMount(() => {
	fetchPrices();
	// Refresh every 2 minutes
	const interval = setInterval(fetchPrices, 120000);
	return () => clearInterval(interval);
});
</script>

<div class="mb-4 hidden md:block">
	<!-- Header -->
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{s('crypto.grid.title')}</h3>
		<button
			onclick={handleRefresh}
			disabled={refreshing}
			class="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
			aria-label="Refresh prices"
		>
			<IconRefresh class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
		</button>
	</div>

	<!-- Grid -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		{#each cryptos as crypto}
			{@const priceData = data.get(crypto.id)}
			{@const isPositive = (priceData?.priceChangePercentage24h ?? 0) >= 0}
			{@const sparklinePath = priceData?.sparkline ? generateSparklinePath(priceData.sparkline) : ''}

			<div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
				<div class="flex items-start justify-between">
					<!-- Icon & Name -->
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full {crypto.color} p-1">
							<img
								src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/{symbolMap[crypto.id] || 'btc'}.svg"
								alt={crypto.id}
								class="h-full w-full"
								onerror={(e) => {
									const img = e.currentTarget as HTMLImageElement;
									img.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/btc.svg';
								}}
							/>
						</div>
						<div class="flex flex-col">
							<span class="text-xs font-medium text-gray-900 dark:text-gray-100">
								{priceData?.symbol || '...'}
							</span>
							<span class="text-[10px] text-gray-600 dark:text-gray-400">
								{priceData?.name || crypto.id}
							</span>
						</div>
					</div>

					<!-- Sparkline -->
					{#if !loading && sparklinePath}
						<svg class="h-5 w-[60px]" viewBox="0 0 60 20">
							<path
								d={sparklinePath}
								fill="none"
								stroke={isPositive ? '#16a34a' : '#dc2626'}
								stroke-width="1.5"
								vector-effect="non-scaling-stroke"
							/>
						</svg>
					{/if}
				</div>

				<!-- Price -->
				<div class="mt-2">
					<div class="text-lg font-bold text-gray-900 dark:text-gray-100">
						{loading || !priceData ? '...' : formatPrice(priceData.price)}
					</div>
					{#if !loading && priceData}
						<div class="flex items-center gap-1 text-xs font-medium {isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
							{#if isPositive}
								<IconTrendingUp class="h-3 w-3" />
							{:else}
								<IconTrendingDown class="h-3 w-3" />
							{/if}
							<span>{isPositive ? '+' : ''}{priceData.priceChangePercentage24h.toFixed(2)}%</span>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
