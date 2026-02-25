<script lang="ts">
import { IconRefresh, IconTrendingDown, IconTrendingUp } from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { s } from '$lib/client/localization.svelte';

interface Props {
	cryptoId?: string;
	showStats?: boolean;
}

let { cryptoId = 'bitcoin', showStats = true }: Props = $props();

interface PriceData {
	id: string;
	symbol: string;
	name: string;
	price: number;
	priceChange24h: number;
	priceChangePercentage24h: number;
	high24h: number;
	low24h: number;
	marketCap: number;
	volume24h: number;
	sparkline: number[];
}

let loading = $state(true);
let data: PriceData | null = $state(null);
let refreshing = $state(false);

async function fetchPrice() {
	try {
		const response = await fetch(`/api/widgets/crypto/price?id=${cryptoId}`);
		if (response.ok) {
			const result = await response.json();
			data = result.data;
		}
	} catch (error) {
		console.error(`Failed to fetch ${cryptoId} price:`, error);
	} finally {
		loading = false;
		refreshing = false;
	}
}

async function handleRefresh() {
	refreshing = true;
	await fetchPrice();
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

// Format large numbers (market cap, volume)
function formatLargeNumber(num: number): string {
	if (num >= 1e12) {
		return `$${(num / 1e12).toFixed(2)}T`;
	} else if (num >= 1e9) {
		return `$${(num / 1e9).toFixed(2)}B`;
	} else if (num >= 1e6) {
		return `$${(num / 1e6).toFixed(2)}M`;
	}
	return `$${num.toFixed(0)}`;
}

// Generate SVG path for sparkline
function generateSparklinePath(prices: number[]): string {
	if (!prices || prices.length === 0) return '';

	const width = 120;
	const height = 30;
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

// Crypto color schemes
const cryptoColors: Record<string, { bg: string; border: string; icon: string }> = {
	bitcoin: {
		bg: 'from-orange-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900',
		border: 'border-orange-200 dark:border-gray-700',
		icon: 'bg-orange-500',
	},
	ethereum: {
		bg: 'from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900',
		border: 'border-purple-200 dark:border-gray-700',
		icon: 'bg-purple-500',
	},
	default: {
		bg: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
		border: 'border-gray-200 dark:border-gray-700',
		icon: 'bg-blue-500',
	},
};

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

const colors = $derived(cryptoColors[cryptoId] || cryptoColors.default);
const sparklinePath = $derived.by(() => {
	if (data?.sparkline) {
		return generateSparklinePath(data.sparkline);
	}
	return '';
});
const isPositive = $derived.by(() => {
	if (data) {
		return data.priceChangePercentage24h >= 0;
	}
	return false;
});
const iconSymbol = $derived(symbolMap[cryptoId] || 'btc');

onMount(() => {
	fetchPrice();
	// Refresh every 2 minutes
	const interval = setInterval(fetchPrice, 120000);
	return () => clearInterval(interval);
});
</script>

<div class="mb-4 rounded-lg border {colors.border} bg-gradient-to-br {colors.bg}">
	<div class="flex items-center justify-between px-4 py-3">
		<div class="flex items-center gap-3">
			<!-- Crypto Icon -->
			<div class="flex h-10 w-10 items-center justify-center rounded-full {colors.icon} p-1.5">
				<img
					src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/{iconSymbol}.svg"
					alt={cryptoId}
					class="h-full w-full"
					onerror={(e) => {
						const img = e.currentTarget as HTMLImageElement;
						img.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/btc.svg';
					}}
				/>
			</div>

			<!-- Price Info -->
			<div class="flex flex-col">
				<div class="flex items-baseline gap-2">
					{#if !loading && data}
						<span class="text-xs font-medium text-gray-600 dark:text-gray-400">{data.symbol}</span>
					{/if}
					<span class="text-2xl font-bold text-gray-900 dark:text-gray-100">
						{loading ? '...' : formatPrice(data?.price ?? 0)}
					</span>
					{#if !loading && data}
						<div class="flex items-center gap-1 text-sm font-medium {isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
							{#if isPositive}
								<IconTrendingUp class="h-4 w-4" />
							{:else}
								<IconTrendingDown class="h-4 w-4" />
							{/if}
							<span>{isPositive ? '+' : ''}{data.priceChangePercentage24h.toFixed(2)}%</span>
						</div>
					{/if}
				</div>
				<div class="flex gap-3 text-xs text-gray-600 dark:text-gray-400">
					{#if !loading && data}
						<span>24h: {formatPrice(data.low24h)} - {formatPrice(data.high24h)}</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Sparkline & Refresh -->
		<div class="flex items-center gap-3">
			{#if !loading && data && sparklinePath}
				<svg class="h-8 w-[120px]" viewBox="0 0 120 30">
					<path
						d={sparklinePath}
						fill="none"
						stroke={isPositive ? '#16a34a' : '#dc2626'}
						stroke-width="1.5"
						vector-effect="non-scaling-stroke"
					/>
				</svg>
			{/if}
			<button
				onclick={handleRefresh}
				disabled={refreshing}
				class="rounded p-1.5 text-gray-600 transition-colors hover:bg-white/50 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700/50"
				aria-label="Refresh price"
			>
				<IconRefresh class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			</button>
		</div>
	</div>
</div>
