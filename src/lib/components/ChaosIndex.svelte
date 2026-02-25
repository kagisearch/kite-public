<script lang="ts">
import Chart from 'chart.js/auto';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { languageSettings } from '$lib/data/settings.svelte.js';
import { dataService } from '$lib/services/dataService';
import { createModalBehavior } from '$lib/utils/modalBehavior.svelte';
import { splitFirstSentence } from '$lib/utils/sentenceSplitter';
import LottieAnimation from './LottieAnimation.svelte';
import 'chartjs-adapter-date-fns';
import { useOverlayScrollbars } from 'overlayscrollbars-svelte';
import { fade } from 'svelte/transition';

// Props
interface Props {
	score: number;
	summary: string;
	lastUpdated: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	renderModal?: boolean;
}

let {
	score,
	summary,
	lastUpdated,
	open = $bindable(false),
	onOpenChange,
	renderModal = true,
}: Props = $props();

let showExplanation = $state(false);
let historicalData = $state<Array<{ date: string; score: number; summary: string }>>([]);
let isLoadingHistory = $state(false);
let chartCanvas = $state<HTMLCanvasElement>();
let chartInstance: Chart | null = null;
let scrollContainer = $state<HTMLElement>();

// Modal behavior
const modal = createModalBehavior();

// Clear historical data cache when new chaos index data arrives
let lastKnownUpdate: string | undefined;
$effect.pre(() => {
	const currentUpdate = lastUpdated;
	if (lastKnownUpdate !== undefined && currentUpdate !== lastKnownUpdate) {
		// Clear cached data so it gets re-fetched next time modal opens
		historicalData = [];
		// If modal is already open, trigger a refresh
		if (open && !isLoadingHistory) {
			refreshHistoricalData();
		}
	}
	lastKnownUpdate = currentUpdate;
});

// Fetch historical data
async function refreshHistoricalData() {
	isLoadingHistory = true;
	try {
		historicalData = await dataService.getChaosIndexHistory(languageSettings.data, 30);
	} catch (error) {
		console.error('Failed to load historical data:', error);
	} finally {
		isLoadingHistory = false;
	}
}

// Initialize OverlayScrollbars
const [initializeScrollbar] = useOverlayScrollbars({
	defer: false,
	options: {
		scrollbars: {
			visibility: 'auto',
			autoHide: 'leave',
			autoHideDelay: 800,
		},
		overflow: {
			x: 'hidden',
		},
	},
});

// Get temperature description
function getTemperatureText(): string {
	if (score <= 20) return s('worldTension.cool') || 'Cool';
	if (score <= 40) return s('worldTension.mild') || 'Mild';
	if (score <= 60) return s('worldTension.warm') || 'Warm';
	if (score <= 80) return s('worldTension.hot') || 'Hot';
	return s('worldTension.burning') || 'Burning';
}

// Get status color classes
function getStatusColor(): string {
	if (score <= 20) return 'from-blue-500 to-cyan-500';
	if (score <= 40) return 'from-green-500 to-emerald-500';
	if (score <= 60) return 'from-yellow-500 to-orange-500';
	if (score <= 80) return 'from-orange-500 to-red-500';
	return 'from-red-500 to-red-700';
}

// Import Lottie animations (these will be added from LottieFiles)
let weatherAnimations = $state<Record<string, any>>({});

// Load animations dynamically
async function loadAnimations() {
	try {
		// Import all animations
		const [snow, sunnyCloudy, storm, smallFire, bigFire] = await Promise.all([
			import('$lib/assets/lottie/snow.json'),
			import('$lib/assets/lottie/sunny-cloudy.json'),
			import('$lib/assets/lottie/storm.json'), // Storm with lightning
			import('$lib/assets/lottie/small-fire.json'), // Small fire for "very hot"
			import('$lib/assets/lottie/big-fire.json'), // Big violent fire for "on fire"
		]);

		weatherAnimations = {
			snow: snow.default || snow,
			sunnyCloudy: sunnyCloudy.default || sunnyCloudy,
			storm: storm.default || storm,
			smallFire: smallFire.default || smallFire,
			bigFire: bigFire.default || bigFire,
		};
	} catch (error) {
		console.error('Failed to load animations:', error);
	}
}

// Get weather animation based on score
function getWeatherAnimation(): string {
	if (score <= 20)
		return 'snow'; // Cool - peaceful/cold
	else if (score <= 40)
		return 'sunnyCloudy'; // Mild - partly cloudy
	else if (score <= 80)
		return 'smallFire'; // Warm/Hot - fire
	else return 'bigFire'; // Burning - big fire
}

// Handle click to show modal
async function handleClick() {
	open = true;
	onOpenChange?.(true);
	showExplanation = false;

	// Push ?view=chaos to URL for deep-linking and back button support
	if (browser) {
		const url = new URL(window.location.href);
		if (url.searchParams.get('view') !== 'chaos') {
			url.searchParams.set('view', 'chaos');
			window.history.pushState({}, '', url.pathname + url.search);
		}
	}

	// Load animations if not already loaded
	if (Object.keys(weatherAnimations).length === 0) {
		await loadAnimations();
	}

	// Load historical data if not cached
	if (!isLoadingHistory && historicalData.length === 0) {
		await refreshHistoricalData();
	}
}

// Handle close modal
function closeModal() {
	open = false;
	onOpenChange?.(false);
	showExplanation = false;
	if (chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}

	// Remove ?view=chaos from URL (replace, not push, to avoid double-back)
	if (browser) {
		const url = new URL(window.location.href);
		if (url.searchParams.has('view')) {
			url.searchParams.delete('view');
			const newUrl = url.pathname + (url.search || '');
			history.replaceState(history.state, '', newUrl);
		}
	}
}

// Close modal when browser back removes ?view=chaos
$effect(() => {
	if (!browser) return;

	const handlePopState = () => {
		const url = new URL(window.location.href);
		if (url.searchParams.get('view') !== 'chaos' && open) {
			open = false;
			onOpenChange?.(false);
			showExplanation = false;
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		}
	};

	window.addEventListener('popstate', handlePopState);
	return () => window.removeEventListener('popstate', handlePopState);
});

// Auto-open when open prop is set externally (e.g., from ?view=chaos on page load)
$effect(() => {
	if (open && browser) {
		// Trigger data loading if modal was opened externally
		if (Object.keys(weatherAnimations).length === 0) {
			loadAnimations();
		}
		if (!isLoadingHistory && historicalData.length === 0) {
			refreshHistoricalData();
		}
	}
});

// Score-to-color mapping — smooth interpolation between thresholds
// Returns [r, g, b] for a given score so we can blend between adjacent thresholds.
const COLOR_STOPS: [number, [number, number, number]][] = [
	[0, [59, 130, 246]], // blue
	[20, [59, 130, 246]], // blue
	[30, [34, 197, 94]], // green
	[50, [251, 191, 36]], // yellow/amber
	[70, [251, 146, 60]], // orange
	[85, [239, 68, 68]], // red
	[100, [239, 68, 68]], // red
];

function getScoreRGB(value: number): [number, number, number] {
	for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
		const [lo, loColor] = COLOR_STOPS[i];
		const [hi, hiColor] = COLOR_STOPS[i + 1];
		if (value >= lo && value <= hi) {
			const t = hi === lo ? 0 : (value - lo) / (hi - lo);
			return [
				Math.round(loColor[0] + (hiColor[0] - loColor[0]) * t),
				Math.round(loColor[1] + (hiColor[1] - loColor[1]) * t),
				Math.round(loColor[2] + (hiColor[2] - loColor[2]) * t),
			];
		}
	}
	return COLOR_STOPS[COLOR_STOPS.length - 1][1];
}

function getScoreColor(value: number, alpha: number = 1): string {
	const [r, g, b] = getScoreRGB(value);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Create or update chart
function createChart() {
	if (!chartCanvas || historicalData.length < 2) return;

	if (chartInstance) {
		chartInstance.destroy();
	}

	const isDark = document.documentElement.classList.contains('dark');
	const ctx = chartCanvas.getContext('2d')!;
	const scores = historicalData.map((d) => d.score);

	chartInstance = new Chart(chartCanvas, {
		type: 'line',
		data: {
			labels: historicalData.map((d) => new Date(d.date)),
			datasets: [
				{
					label: s('worldTension.chaosIndex') || 'Chaos Index',
					data: scores,
					borderColor: getScoreColor(scores[0] || score),
					backgroundColor: 'transparent',
					fill: false,
					tension: 0.35,
					pointRadius: historicalData.length <= 10 ? 3 : 0,
					pointHoverRadius: 5,
					pointBackgroundColor: scores.map((v) => getScoreColor(v)),
					pointBorderColor: scores.map((v) => getScoreColor(v, 0.8)),
					pointBorderWidth: 1,
					pointHoverBackgroundColor: scores.map((v) => getScoreColor(v)),
					borderWidth: 2.5,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: 'index',
				intersect: false,
			},
			plugins: {
				legend: {
					display: false,
				},
				tooltip: {
					backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
					titleColor: isDark ? '#e5e7eb' : '#1f2937',
					bodyColor: isDark ? '#e5e7eb' : '#1f2937',
					borderColor: isDark ? '#374151' : '#e5e7eb',
					borderWidth: 1,
					padding: 10,
					cornerRadius: 8,
					displayColors: false,
					callbacks: {
						title: (context) => {
							const timestamp = context[0].parsed.x;
							if (timestamp === null) return '';
							const date = new Date(timestamp);
							return date.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							});
						},
						label: (context) => {
							const value = context.parsed.y;
							return `${s('worldTension.chaosIndex') || 'Chaos Index'}: ${value}°`;
						},
					},
				},
			},
			scales: {
				x: {
					type: 'time',
					time: {
						unit: 'day',
						displayFormats: {
							day: 'MMM d',
						},
					},
					grid: {
						display: false,
					},
					ticks: {
						color: isDark ? '#6b7280' : '#9ca3af',
						maxRotation: 0,
						font: { size: 10 },
					},
					border: {
						display: false,
					},
				},
				y: {
					beginAtZero: true,
					max: 100,
					grid: {
						color: isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(229, 231, 235, 0.6)',
					},
					ticks: {
						color: isDark ? '#6b7280' : '#9ca3af',
						callback: (value) => `${value}°`,
						font: { size: 10 },
						stepSize: 25,
					},
					border: {
						display: false,
					},
				},
			},
		},
		plugins: [],
	});

	// Apply gradient after chart is created and layout is computed
	const chartArea = chartInstance.chartArea;
	if (chartArea && scores.length >= 2) {
		const width = chartArea.right - chartArea.left;
		const meta = chartInstance.getDatasetMeta(0);
		const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
		for (let i = 0; i < scores.length; i++) {
			const px = meta.data[i]?.x ?? chartArea.left + (i / (scores.length - 1)) * width;
			const stop = Math.max(0, Math.min(1, (px - chartArea.left) / width));
			gradient.addColorStop(stop, getScoreColor(scores[i]));
		}
		chartInstance.data.datasets[0].borderColor = gradient;
		chartInstance.update('none');
	}
}

// Update chart when data changes
$effect(() => {
	if (historicalData.length >= 2 && open && chartCanvas) {
		setTimeout(createChart, 100);
	}
});

// Apply scroll lock
$effect(() => {
	if (open) {
		return modal.applyScrollLock();
	}
});

// Initialize OverlayScrollbars when modal opens
$effect(() => {
	if (open && scrollContainer) {
		initializeScrollbar(scrollContainer);
	}
});

// Toggle explanation
function toggleExplanation() {
	showExplanation = !showExplanation;
}
</script>

<svelte:window
  onkeydown={(e) => modal.handleKeydown(e, open, closeModal)}
/>

<!-- Icon Button -->
{#if score > 0}
  <button
    onclick={handleClick}
    class="flex items-center gap-1.5 rounded-md ps-1.5 pe-0 py-2 sm:px-1.5 md:px-2 md:py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
    title="World Tension: {score}° - {getTemperatureText()}"
    aria-label="Show world tension details"
  >
    <!-- Simple status dot -->
    <div class="h-2 w-2 rounded-full bg-gradient-to-r {getStatusColor()}"></div>

    <!-- Text - hide description on mobile to prevent wrapping -->
    <span class="whitespace-nowrap">
      {score}°<span class="hidden sm:inline"> {getTemperatureText()}</span>
    </span>
  </button>
{/if}

<!-- Modal (only rendered by one instance to avoid stacking backdrops) -->
{#if open && renderModal}
  <Portal>
    <div
      class="fixed inset-0 z-modal flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onclick={(e) => modal.handleBackdropClick(e, closeModal)}
      onkeydown={(e) => e.key === "Escape" && closeModal()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chaos-title"
      tabindex="-1"
      transition:fade={{ duration: modal.getTransitionDuration() }}
    >
      <div
        class="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-xl md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-lg dark:bg-gray-800"
      >
      <!-- Header -->
      <div
        class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"
      >
        <h3
          id="chaos-title"
          class="text-lg font-semibold text-gray-900 dark:text-white"
        >
          {s("worldTension.title") || "Global Stability Index"}
        </h3>
        <button
          onclick={closeModal}
          class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Close dialog"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <main
        bind:this={scrollContainer}
        class="flex-1 overflow-y-auto p-6 md:min-h-[718px]"
        data-overlayscrollbars-initialize
      >
        {#if !showExplanation}
          <!-- Current Status -->
          {@const animationKey = getWeatherAnimation()}
          <div class="mb-6 flex items-center justify-between">
            <div>
              <div class="flex items-baseline gap-3">
                <span class="text-4xl font-bold tabular-nums text-gray-900 dark:text-white"
                  >{score}°</span
                >
                <span
                  class="text-lg font-medium text-gray-600 dark:text-gray-400"
                  >{getTemperatureText()}</span
                >
              </div>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {s("worldTension.updated") || "Updated"}
                {new Date(lastUpdated).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div class="flex h-16 w-16 items-center justify-center">
              <!-- Lottie Weather Animation -->
              {#if weatherAnimations[animationKey]}
                <LottieAnimation
                  animationData={weatherAnimations[animationKey]}
                  width={80}
                  height={80}
                  loop={true}
                  autoplay={true}
                  loopFrameOffset={animationKey === "bigFire"
                    ? 2
                    : animationKey === "smallFire"
                      ? 1
                      : 0}
                />
              {:else}
                <!-- Fallback loading state -->
                <div
                  class="h-14 w-14 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
                ></div>
              {/if}
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="mb-6">
            <div
              class="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
            >
              <div
                class="absolute inset-0 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 opacity-30"
              ></div>
              <div
                class="absolute start-0 h-full bg-gradient-to-r {getStatusColor()} transition-all duration-200"
                style="width: {score}%"
              ></div>
              <div
                class="absolute h-full w-0.5 bg-gray-900 dark:bg-white"
                style="inset-inline-start: {score}%"
              ></div>
            </div>
            <div
              class="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400"
            >
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <!-- Summary -->
          {@const [firstSentence, restText] = splitFirstSentence(summary)}
          <div class="mb-6 rounded-lg bg-gray-50 p-5 dark:bg-gray-800/50">
            <div class="space-y-2">
              <p
                class="text-base font-medium leading-relaxed text-gray-900 dark:text-gray-100"
                dir="auto"
              >
                {firstSentence}
              </p>
              {#if restText}
                <p
                  class="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                  dir="auto"
                >
                  {restText}
                </p>
              {/if}
            </div>
          </div>

          <!-- Historical Chart -->
          {#if historicalData.length >= 2}
            <div class="mb-6">
              <h4
                class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {s("worldTension.trendTitle") || "30-Day Trend"}
              </h4>
              <div
                class="relative h-40 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50"
              >
                <canvas bind:this={chartCanvas} class="absolute inset-0"
                ></canvas>
              </div>
            </div>
          {:else if isLoadingHistory}
            <div class="mb-6 animate-pulse">
              <div class="mb-3 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div class="h-40 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                <!-- Skeleton Y-axis labels + grid lines -->
                <div class="flex h-full items-end gap-1">
                  <!-- Y-axis labels -->
                  <div class="flex h-full flex-col justify-between pb-5">
                    <div class="h-2.5 w-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                    <div class="h-2.5 w-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                    <div class="h-2.5 w-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                  <!-- Chart area with line shape -->
                  <div class="relative flex-1 h-full">
                    <!-- Horizontal grid lines -->
                    <div class="absolute inset-x-0 top-0 border-t border-gray-200 dark:border-gray-700"></div>
                    <div class="absolute inset-x-0 top-1/2 border-t border-gray-200 dark:border-gray-700"></div>
                    <div class="absolute inset-x-0 bottom-5 border-t border-gray-200 dark:border-gray-700"></div>
                    <!-- Skeleton line shape -->
                    <svg class="absolute inset-0 w-full h-[calc(100%-20px)]" preserveAspectRatio="none" viewBox="0 0 200 80">
                      <polyline
                        points="0,50 25,45 50,55 75,40 100,48 125,35 150,42 175,38 200,44"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="text-gray-200 dark:text-gray-700"
                      />
                    </svg>
                    <!-- X-axis date labels -->
                    <div class="absolute inset-x-0 bottom-0 flex justify-between">
                      <div class="h-2.5 w-8 rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div class="h-2.5 w-8 rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div class="h-2.5 w-8 rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div class="h-2.5 w-8 rounded bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Learn More Button -->
          <div class="text-center">
            <button
              onclick={toggleExplanation}
              class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {s("worldTension.whatIsThis") || "What is this?"}
            </button>
          </div>
        {:else}
          <!-- Explanation -->
          <div>
            <button
              onclick={toggleExplanation}
              class="mb-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </button>

            <div class="space-y-5">
              <!-- Scale Section -->
              <div>
                <div class="space-y-1 text-sm">
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span class="text-gray-600 dark:text-gray-400"
                      >{s("worldTension.scale.cool") ||
                        "0-20° Cool - Calm period, routine activity"}</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-green-500"></div>
                    <span class="text-gray-600 dark:text-gray-400"
                      >{s("worldTension.scale.mild") ||
                        "21-40° Mild - Normal global tensions"}</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <span class="text-gray-600 dark:text-gray-400"
                      >{s("worldTension.scale.warm") ||
                        "41-60° Warm - Elevated concerns"}</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-orange-500"></div>
                    <span class="text-gray-600 dark:text-gray-400"
                      >{s("worldTension.scale.hot") ||
                        "61-80° Hot - Serious situations"}</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-red-500"></div>
                    <span class="text-gray-600 dark:text-gray-400"
                      >{s("worldTension.scale.burning") ||
                        "81-100° Burning - Extreme crisis (rare)"}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Methodology Section -->
              <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
                <h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {s("worldTension.howCalculated") || "How it's calculated"}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {s("worldTension.methodologyIntro") ||
                    "The World Tension index is generated by AI analysis of current World news headlines. Rather than a fixed formula, it uses reasoning to evaluate global stability."}
                </p>
              </div>

              <!-- Factors Section -->
              <div>
                <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {s("worldTension.factorsTitle") || "The AI considers four key factors:"}
                </p>
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li class="flex gap-2">
                    <span class="text-gray-400">1.</span>
                    <span>{s("worldTension.factor.novelty") || "Novelty — New crises or escalations are weighted more heavily than ongoing situations that are already \"priced in.\""}</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-gray-400">2.</span>
                    <span>{s("worldTension.factor.worstCase") || "Proximity to worst case — How close events are to catastrophic outcomes, with nuclear/WMD situations given outsized weight."}</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-gray-400">3.</span>
                    <span>{s("worldTension.factor.reversibility") || "Reversibility — Irreversible actions (invasions, loss of life) are weighted more than reversible ones (sanctions, rhetoric)."}</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-gray-400">4.</span>
                    <span>{s("worldTension.factor.scope") || "Scope of impact — Global systemic risks, economic contagion, and alliance triggers are weighed against localized events."}</span>
                  </li>
                </ul>
              </div>

              <!-- Why Section -->
              <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
                <h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {s("worldTension.consistencyTitle") || "Why this exists"}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {s("worldTension.consistencyText") ||
                    "Between alarming headlines, doomscrolling, and 24/7 news cycles, it can feel like the world is constantly on fire. This index aims to provide a grounded perspective. Often, things aren't as bad as they feel."}
                </p>
              </div>

            </div>
          </div>
        {/if}
      </main>
    </div>
  </div>
  </Portal>
{/if}
