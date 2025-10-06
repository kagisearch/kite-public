<script lang="ts">
import Chart from 'chart.js/auto';
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
}

let { score, summary, lastUpdated }: Props = $props();

// State
let showModal = $state(false);
let showExplanation = $state(false);
let historicalData = $state<Array<{ date: string; score: number; summary: string }>>([]);
let isLoadingHistory = $state(false);
let chartCanvas = $state<HTMLCanvasElement>();
let chartInstance: Chart | null = null;
let scrollContainer = $state<HTMLElement>();

// Modal behavior
const modal = createModalBehavior();

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
	else if (score <= 60)
		return 'storm'; // Warm - storm brewing
	else if (score <= 80)
		return 'smallFire'; // Hot - small fire
	else return 'bigFire'; // Burning - big fire
}

// Handle click to show modal
async function handleClick() {
	showModal = true;
	showExplanation = false;

	// Load animations if not already loaded
	if (Object.keys(weatherAnimations).length === 0) {
		await loadAnimations();
	}

	// Load historical data
	if (!isLoadingHistory && historicalData.length === 0) {
		isLoadingHistory = true;
		try {
			historicalData = await dataService.getChaosIndexHistory(languageSettings.data, 30);
		} catch (error) {
			console.error('Failed to load historical data:', error);
		} finally {
			isLoadingHistory = false;
		}
	}
}

// Handle close modal
function closeModal() {
	showModal = false;
	showExplanation = false;
	if (chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}
}

// Create or update chart
function createChart() {
	if (!chartCanvas || historicalData.length < 2) return;

	if (chartInstance) {
		chartInstance.destroy();
	}

	const isDark = document.documentElement.classList.contains('dark');

	chartInstance = new Chart(chartCanvas, {
		type: 'line',
		data: {
			labels: historicalData.map((d) => new Date(d.date)),
			datasets: [
				{
					label: s('worldTension.chaosIndex') || 'Chaos Index',
					data: historicalData.map((d) => d.score),
					borderColor: getChartColor(historicalData[historicalData.length - 1]?.score || score),
					backgroundColor: getChartColor(
						historicalData[historicalData.length - 1]?.score || score,
						0.1,
					),
					tension: 0.4,
					pointRadius: historicalData.length <= 7 ? 4 : 2,
					pointHoverRadius: 6,
					borderWidth: 2,
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
					backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
					titleColor: isDark ? '#e5e7eb' : '#1f2937',
					bodyColor: isDark ? '#e5e7eb' : '#1f2937',
					borderColor: isDark ? '#374151' : '#e5e7eb',
					borderWidth: 1,
					callbacks: {
						title: (context) => {
							// For time scale, the parsed.x contains the timestamp
							const date = new Date(context[0].parsed.x);
							return date.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							});
						},
						label: (context) =>
							`${s('worldTension.chaosIndex') || 'Chaos Index'}: ${context.parsed.y}°`,
					},
				},
			},
			scales: {
				x: {
					type: 'time',
					time: {
						unit: historicalData.length > 7 ? 'day' : 'day',
						displayFormats: {
							day: 'MMM d',
						},
					},
					grid: {
						color: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.5)',
						display: true,
					},
					ticks: {
						color: isDark ? '#9ca3af' : '#6b7280',
						maxRotation: 0,
					},
				},
				y: {
					beginAtZero: true,
					max: 100,
					grid: {
						color: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.5)',
						display: true,
					},
					ticks: {
						color: isDark ? '#9ca3af' : '#6b7280',
						callback: (value) => `${value}°`,
					},
				},
			},
		},
	});
}

// Get chart color based on score
function getChartColor(score: number, alpha: number = 1): string {
	if (score <= 20) return `rgba(59, 130, 246, ${alpha})`; // blue
	if (score <= 40) return `rgba(34, 197, 94, ${alpha})`; // green
	if (score <= 60) return `rgba(251, 191, 36, ${alpha})`; // yellow
	if (score <= 80) return `rgba(251, 146, 60, ${alpha})`; // orange
	return `rgba(239, 68, 68, ${alpha})`; // red
}

// Update chart when data changes
$effect(() => {
	if (historicalData.length >= 2 && showModal && chartCanvas) {
		setTimeout(createChart, 100);
	}
});

// Apply scroll lock
$effect(() => {
	modal.applyScrollLock(showModal);
	return () => {
		// Ensure scroll is unlocked when component unmounts
		modal.applyScrollLock(false);
	};
});

// Initialize OverlayScrollbars when modal opens
$effect(() => {
	if (showModal && scrollContainer) {
		initializeScrollbar(scrollContainer);
	}
});

// Toggle explanation
function toggleExplanation() {
	showExplanation = !showExplanation;
}
</script>

<svelte:window
  onkeydown={(e) => modal.handleKeydown(e, showModal, closeModal)}
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

    <!-- Text -->
    <span>
      {getTemperatureText()}
    </span>
  </button>
{/if}

<!-- Modal -->
{#if showModal}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 md:p-4 dark:bg-black/80"
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
      transition:fade={{ duration: modal.getTransitionDuration() }}
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
        class="flex-1 overflow-y-auto p-6"
        data-overlayscrollbars-initialize
      >
        {#if !showExplanation}
          <!-- Current Status -->
          {@const animationKey = getWeatherAnimation()}
          <div class="mb-6 flex items-center justify-between">
            <div>
              <div class="flex items-baseline gap-3">
                <span class="text-4xl font-bold text-gray-900 dark:text-white"
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
                class="absolute start-0 h-full bg-gradient-to-r {getStatusColor()} transition-all duration-300"
                style="width: {score}%"
              ></div>
              <div
                class="absolute h-full w-0.5 bg-gray-900 dark:bg-white"
                style="left: {score}%"
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
            <div class="mb-6">
              <div class="h-24 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                <div class="flex h-full items-center justify-center">
                  <div
                    class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
                  ></div>
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

            <div class="space-y-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {s("worldTension.explanation1") ||
                  "The Global Stability Index analyzes world news to measure geopolitical tensions and stability."}
              </p>

              <!-- Simple scale -->
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
          </div>
        {/if}
      </main>
    </div>
  </div>
{/if}
