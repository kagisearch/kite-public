<script lang="ts">
import { IconClock, IconSearch, IconSettings, IconTextSize } from '@tabler/icons-svelte';
import { getContext, untrack } from 'svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { features } from '$lib/config/features';
import {
	displaySettings,
	type FontSize,
	languageSettings,
	settings,
	settingsModalState,
	themeSettings,
} from '$lib/data/settings.svelte.js';
import { dataReloadService, dataService } from '$lib/services/dataService';
import { experimental } from '$lib/stores/experimental.svelte';
import { headerAnimation } from '$lib/stores/headerAnimation.svelte';
import { timeTravel } from '$lib/stores/timeTravel.svelte.js';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import { formatTimeAgo } from '$lib/utils/formatTimeAgo';
import { getNextUpdateCountdown } from '$lib/utils/getTimeAgo';
import AppNavigation from './AppNavigation.svelte';
import ChaosIndex from './ChaosIndex.svelte';

// Props
interface Props {
	totalReadCount?: number;
	totalStoriesRead?: number;
	offlineMode?: boolean;
	getLastUpdated?: () => string;
	lastUpdatedTimestamp?: number; // Unix timestamp for calculating next update
	chaosIndex?: {
		score: number;
		summary: string;
		lastUpdated: string;
	};
	onSearchClick?: () => void;
	isSharedView?: boolean;
	onLogoClick?: () => void;
	dataLoaded?: boolean;
	chaosModalOpen?: boolean;
	onChaosModalChange?: (open: boolean) => void;
}

let {
	totalReadCount = 0,
	totalStoriesRead = 0,
	offlineMode = false,
	getLastUpdated = () => 'Never',
	lastUpdatedTimestamp,
	chaosIndex,
	onSearchClick,
	isSharedView = false,
	onLogoClick,
	dataLoaded = false,
	chaosModalOpen = $bindable(false),
	onChaosModalChange,
}: Props = $props();

// Get session from context for subscription check
const session = getContext<Session | null>('session');
const isSubscriber = $derived(session?.subscription === true);

// Date click state for cycling through different stats
let dateClickCount = $state(0);

// Time travel state
let isExitingTimeTravel = $state(false);
const isInTimeTravel = $derived(!!timeTravel.selectedDate || isExitingTimeTravel);

// Kite animation state
let showFlyingKite = $state(false);
let kiteStartPosition = $state({ x: 0, y: 0 });
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

// Time-based display state (updates every minute)
let nextUpdateText = $state('');
let nextUpdateIsSoon = $state(false);
let lastUpdatedText = $state('');

// Update time-based displays every minute so they stay current
$effect(() => {
	if (browser && lastUpdatedTimestamp) {
		const lastUpdateDate = new Date(lastUpdatedTimestamp * 1000).toISOString();

		const updateTimeDisplays = () => {
			// Update "Next update in X" countdown
			const countdown = getNextUpdateCountdown(lastUpdateDate);
			nextUpdateText = countdown.text;
			nextUpdateIsSoon = countdown.isSoon;
			// Update "Updated X ago" text
			lastUpdatedText = formatTimeAgo(lastUpdatedTimestamp, s);
		};

		updateTimeDisplays();
		const interval = setInterval(updateTimeDisplays, 60000);
		return () => clearInterval(interval);
	}
});

// Platform detection for keyboard shortcut
const isMac =
	browser &&
	(('userAgentData' in navigator && (navigator as any).userAgentData?.platform === 'macOS') ||
		navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);
const searchTooltip = $derived(s('header.search') + (isMac ? ' (⌘K)' : ' (Ctrl+K)'));

function handleLogoClick() {
	// Don't handle clicks during animation
	if (isAnimating) {
		return;
	}

	// Cancel any pending hover animation
	if (hoverTimeout) {
		clearTimeout(hoverTimeout);
		hoverTimeout = null;
	}

	// Call the parent handler (handles both shared view exit and normal home reset)
	if (onLogoClick) {
		onLogoClick();
	}

	// Reset date click count
	dateClickCount = 0;
}

function handleLogoHover(event: MouseEvent) {
	// Only trigger animation on hover, not on click
	if (hoverTimeout) return; // Already hovering
	if (!browser) return; // Only in browser
	if (isExitingTimeTravel) return; // Don't trigger right after exiting time travel

	// Capture the element and its position immediately (before setTimeout)
	const logoElement = event.currentTarget as HTMLElement;
	const rect = logoElement.getBoundingClientRect();
	const startPosition = {
		x: rect.left + rect.width * 0.85, // 85% to the right
		y: rect.top + rect.height / 2,
	};

	console.log('Logo hover started, waiting 1.5s...');
	hoverTimeout = setTimeout(() => {
		console.log('Triggering kite animation!');

		// Set the starting position
		kiteStartPosition = startPosition;

		// Show the flying kite
		showFlyingKite = true;
		console.log('showFlyingKite set to true', { kiteStartPosition, showFlyingKite });

		// Hide it after 8 seconds (it's off-screen by then)
		setTimeout(() => {
			showFlyingKite = false;
			console.log('Kite animation ended');
		}, 8000);

		hoverTimeout = null;
	}, 1500); // 1.5 second hover delay
}

function handleLogoLeave() {
	// Cancel pending hover animation if mouse leaves before delay
	if (hoverTimeout) {
		console.log('Logo hover cancelled (mouse left)');
		clearTimeout(hoverTimeout);
		hoverTimeout = null;
	}
}

function handleDateClick(event?: Event) {
	// If animation is showing, stop it and switch to normal cycling mode
	if (showAnimation) {
		event?.preventDefault();
		event?.stopPropagation();
		showAnimation = false;
		isAnimating = false;
		animationTimeouts.forEach(clearTimeout);
		animationTimeouts = [];
		// If still on index 0, cycle to 1 instead of staying at 0
		dateClickCount = headerAnimation.index === 0 ? 1 : headerAnimation.index;
		return;
	}
	// Normal cycling behavior (6 states: date, last update, next update, news today, stories read, week/day)
	dateClickCount = (dateClickCount + 1) % 6;
}

// Handle date area keyboard events
function handleDateKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		handleDateClick();
	}
}

// Handle font size toggle
function toggleFontSize() {
	const fontSizes: FontSize[] = ['xs', 'small', 'normal', 'large', 'xl'];
	const currentIndex = fontSizes.indexOf(displaySettings.fontSize);
	const nextIndex = (currentIndex + 1) % fontSizes.length;
	displaySettings.fontSize = fontSizes[nextIndex];
	settings.fontSize.save();
}

// Helper to capitalize first letter
function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// Computed date/stats display
const dateDisplay = $derived.by(() => {
	// If in time travel mode, show the selected date
	if (timeTravel.selectedDate) {
		const dateStr = new Intl.DateTimeFormat(languageSettings.ui, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		}).format(timeTravel.selectedDate);
		return capitalizeFirst(dateStr);
	}

	if (dateClickCount === 0) {
		// Default date format
		const now = new Date();
		const dateStr = new Intl.DateTimeFormat(languageSettings.ui, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
		}).format(now);
		return capitalizeFirst(dateStr);
	} else if (dateClickCount === 1) {
		return lastUpdatedText || getLastUpdated();
	} else if (dateClickCount === 2) {
		// Next update countdown
		if (nextUpdateIsSoon) {
			return s('time.nextUpdate.soon') || 'Next update: soon';
		} else if (nextUpdateText) {
			return (
				s('time.nextUpdate.in', { time: nextUpdateText }) || `Next update in ${nextUpdateText}`
			);
		}
		return ''; // Fallback if no timestamp available
	} else if (dateClickCount === 3) {
		return (
			s('stats.newsToday', { count: totalReadCount.toString() }) || `News today: ${totalReadCount}`
		);
	} else if (dateClickCount === 4) {
		const key = totalStoriesRead === 1 ? 'stats.storyRead' : 'stats.storiesRead';
		return s(key, { count: totalStoriesRead.toString() }) || `Stories read: ${totalStoriesRead}`;
	} else {
		const now = new Date();
		const start = new Date(now.getFullYear(), 0, 1);
		const week = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
		const day = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
		return (
			s('stats.weekDay', { week: week.toString(), day: day.toString() }) ||
			`Week ${week}, Day ${day}`
		);
	}
});

// Header cycling animation state
let isAnimating = $state(false);
let showAnimation = $state(true);
let animationTimeouts: ReturnType<typeof setTimeout>[] = [];

// Cancel animation when entering time travel mode
$effect(() => {
	if (isInTimeTravel && isAnimating) {
		isAnimating = false;
		showAnimation = false;
		animationTimeouts.forEach(clearTimeout);
		animationTimeouts = [];
		headerAnimation.index = 0;
	}
});

// One-time header animation - triggered when data is loaded
$effect(() => {
	if (browser && dataLoaded && !headerAnimation.hasRun && !isInTimeTravel) {
		headerAnimation.markAsRun();
		isAnimating = true;
		showAnimation = true;

		// Animation sequence: show each item for 2s with quick flick transitions
		const sequence = [
			{ index: 1, duration: 2000 }, // Last updated
			{ index: 2, duration: 2000 }, // Next update
			{ index: 3, duration: 2000 }, // News today
			{ index: 4, duration: 2000 }, // Stories read
			{ index: 5, duration: 2000 }, // Week/Day
			{ index: 0, duration: 0 }, // Back to logo
		];

		let currentStep = 0;
		const runSequence = () => {
			// Check if animation was cancelled
			if (!isAnimating || !showAnimation) {
				showAnimation = false;
				isAnimating = false;
				return;
			}

			if (currentStep < sequence.length) {
				const step = sequence[currentStep];
				headerAnimation.index = step.index;
				currentStep++;
				if (step.duration > 0) {
					const timeout = setTimeout(runSequence, step.duration);
					animationTimeouts.push(timeout);
				} else {
					// Animation complete
					isAnimating = false;
					showAnimation = false;
				}
			}
		};

		// Wait 2s on logo, then start sequence
		const initialTimeout = setTimeout(runSequence, 2000);
		animationTimeouts.push(initialTimeout);
	}
});
</script>

{#snippet dateSection()}
  {#if isExitingTimeTravel}
    <!-- Loading state when exiting time travel -->
    <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
      <div
        class="animate-spin h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"
      ></div>
      <span class="text-sm"
        >{s("timeTravel.returningToLive") || "Returning to live..."}</span
      >
    </div>
  {:else if timeTravel.selectedDate}
    <div
      class="flex items-center gap-2 px-2 py-1 rounded-lg {timeTravelBatch.entrySource === 'url' && !settings.timeTravelBannerDismissed.currentValue ? 'tt-pill-highlight bg-blue-100 dark:bg-blue-800/50' : 'bg-blue-50 dark:bg-blue-900/30'}"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 text-blue-600 dark:text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div class="text-sm font-medium text-blue-600 dark:text-blue-400">
        {dateDisplay}
      </div>
      <button
        onclick={async () => {
          timeTravel.reset();
          timeTravelBatch.clear();
          isExitingTimeTravel = true;
          try {
            await dataReloadService.reloadData();
          } finally {
            isExitingTimeTravel = false;
          }
        }}
        class="ms-1 p-0.5 focus-visible-ring rounded"
        aria-label="Exit time travel mode and return to live news"
        disabled={isExitingTimeTravel}
      >
        <svg
          class="size-3 text-blue-600 dark:text-blue-400"
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
  {:else}
    <div
      class="cursor-pointer text-gray-500 dark:text-gray-400 text-base focus-visible-ring rounded px-1 py-1"
      onclick={handleDateClick}
      onkeydown={handleDateKeydown}
      role="button"
      tabindex="0"
      aria-label="Cycle through date and statistics. Current: {dateDisplay}"
      aria-live="polite"
    >
      {dateDisplay}
    </div>
  {/if}
  {#if offlineMode}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="ms-1 inline h-4 w-4 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M1 1l22 22M16.72 11.06a9 9 0 010 1.88M5.64 3.77A9.95 9.95 0 0112 2c2.35 0 4.5.78 6.22 2.08M12 18v-3.5M12 14H9"
      />
    </svg>
  {/if}
{/snippet}

<header class="h-12">
  <!-- First row: Logo, Chaos Index (mobile), and buttons -->
  <div class="flex items-center justify-between relative h-full">
    <!-- Mobile: Time travel mode OR normal logo cycling -->
    {#if isInTimeTravel}
      <!-- Compact time travel display for mobile -->
      <div class="sm:hidden flex items-center h-12">
        {#if isExitingTimeTravel}
          <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <div class="animate-spin h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"></div>
            <span class="text-sm">{s("timeTravel.returningToLive") || "Returning to live..."}</span>
          </div>
        {:else}
          <div class="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium text-blue-600 dark:text-blue-400">
              {timeTravel.selectedDate ? new Intl.DateTimeFormat(languageSettings.ui, { month: 'short', day: 'numeric' }).format(timeTravel.selectedDate) : ''}
            </span>
            <button
              onclick={async () => {
                timeTravel.reset();
                timeTravelBatch.clear();
                isExitingTimeTravel = true;
                try {
                  await dataReloadService.reloadData();
                } finally {
                  isExitingTimeTravel = false;
                }
              }}
              class="p-0.5 focus-visible-ring rounded shrink-0"
              aria-label={s("timeTravel.exitLabel") || "Exit time travel mode"}
              disabled={isExitingTimeTravel}
            >
              <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Normal mobile logo cycling -->
      <div class="sm:hidden flex items-center h-12 overflow-hidden">
        <div
          class="flex flex-col transition-transform duration-200 ease-out"
          style="transform: translateY({(2.5 - headerAnimation.index) * 48}px);"
        >
          <!-- Logo (index 0) -->
          <div class="h-12 flex items-center">
            <button
              onclick={handleLogoClick}
              onmouseenter={handleLogoHover}
              onmouseleave={handleLogoLeave}
              aria-label={s("app.logo.clickToReset") || "Click to reset view to home"}
              disabled={isAnimating}
              class="p-0 border-0 bg-transparent focus-visible-ring rounded"
              class:cursor-pointer={!isAnimating}
              class:cursor-default={isAnimating}
            >
              <img
                src={themeSettings.isDark
                  ? "/svg/kagi_news_compact_dark.svg"
                  : "/svg/kagi_news_compact.svg"}
                alt={s("app.logo.newsAlt") || "Kite News"}
                class="w-[90px] h-auto logo z-modal-backdrop"
                style="isolation: isolate;"
              />
            </button>
          </div>
          <!-- Date displays (indices 1-5) -->
          {#each [1, 2, 3, 4, 5] as index}
            <div class="h-12 flex items-center text-base whitespace-nowrap text-gray-500 dark:text-gray-400">
              {#if index === 1}
                {lastUpdatedText || getLastUpdated()}
              {:else if index === 2}
                {#if nextUpdateIsSoon}
                  {s('time.nextUpdate.soon') || 'Next update: soon'}
                {:else if nextUpdateText}
                  {s('time.nextUpdate.in', { time: nextUpdateText }) || `Next update in ${nextUpdateText}`}
                {/if}
              {:else if index === 3}
                {s('stats.newsToday', { count: totalReadCount.toString() }) || `News today: ${totalReadCount}`}
              {:else if index === 4}
                {#if totalStoriesRead === 1}
                  {s('stats.storyRead', { count: totalStoriesRead.toString() }) || `Story read: ${totalStoriesRead}`}
                {:else}
                  {s('stats.storiesRead', { count: totalStoriesRead.toString() }) || `Stories read: ${totalStoriesRead}`}
                {/if}
              {:else if index === 5}
                {(() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), 0, 1);
                  const week = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
                  const day = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  return s('stats.weekDay', { week: week.toString(), day: day.toString() }) || `Week ${week}, Day ${day}`;
                })()}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Chaos Index - Mobile: hidden during animation and time travel -->
    {#if isSubscriber && experimental.showChaosIndex && chaosIndex && chaosIndex.score > 0 && !isAnimating && !isInTimeTravel}
      <div class="sm:hidden ms-2 me-3">
        <ChaosIndex
          score={chaosIndex.score}
          summary={chaosIndex.summary}
          lastUpdated={chaosIndex.lastUpdated}
          bind:open={chaosModalOpen}
          onOpenChange={onChaosModalChange}
          renderModal={false}
        />
      </div>
    {/if}

    <!-- Desktop: Full logo -->
    <div class="hidden sm:flex items-center">
      <button
        onclick={handleLogoClick}
        onmouseenter={handleLogoHover}
        onmouseleave={handleLogoLeave}
        aria-label={s("app.logo.clickToReset") || "Click to reset view to home"}
        class="me-2 p-0 border-0 bg-transparent cursor-pointer focus-visible-ring rounded"
      >
        <img
          src={themeSettings.isDark
            ? "/svg/kagi_news_compact_dark.svg"
            : "/svg/kagi_news_compact.svg"}
          alt={s("app.logo.newsAlt") || "Kite News"}
          class="w-[90px] h-auto logo relative z-modal-backdrop"
          style="isolation: isolate;"
        />
      </button>
    </div>

    <!-- Date section hidden on mobile, shown on desktop in center -->
    <div class="hidden sm:flex absolute start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 items-center h-12 overflow-hidden">
      {#if showAnimation && !isInTimeTravel}
        <!-- Animation mode: auto-cycling through stats -->
        <div
          class="cursor-pointer"
          onclick={(e) => handleDateClick(e)}
          onkeydown={handleDateKeydown}
          role="button"
          tabindex="0"
          aria-label="Click to stop animation"
        >
          <div
            class="flex flex-col transition-transform duration-200 ease-out"
            style="transform: translateY({(2.5 - headerAnimation.index) * 48}px);"
          >
            <!-- Date section (index 0) -->
            <div class="h-12 flex items-center justify-center">
              {@render dateSection()}
            </div>
            <!-- Stats displays (indices 1-5) -->
            {#each [1, 2, 3, 4, 5] as index}
              <div
                class="h-12 flex items-center justify-center whitespace-nowrap text-gray-500 dark:text-gray-400 text-base"
              >
                {#if index === 1}
                  {lastUpdatedText || getLastUpdated()}
                {:else if index === 2}
                  {#if nextUpdateIsSoon}
                    {s('time.nextUpdate.soon') || 'Next update: soon'}
                  {:else if nextUpdateText}
                    {s('time.nextUpdate.in', { time: nextUpdateText }) || `Next update in ${nextUpdateText}`}
                  {/if}
                {:else if index === 3}
                  {s('stats.newsToday', { count: totalReadCount.toString() }) || `News today: ${totalReadCount}`}
                {:else if index === 4}
                  {#if totalStoriesRead === 1}
                    {s('stats.storyRead', { count: totalStoriesRead.toString() }) || `Story read: ${totalStoriesRead}`}
                  {:else}
                    {s('stats.storiesRead', { count: totalStoriesRead.toString() }) || `Stories read: ${totalStoriesRead}`}
                  {/if}
                {:else if index === 5}
                  {(() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), 0, 1);
                    const week = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
                    const day = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    return s('stats.weekDay', { week: week.toString(), day: day.toString() }) || `Week ${week}, Day ${day}`;
                  })()}
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <!-- Normal cycling mode: click to cycle manually -->
        {@render dateSection()}
      {/if}
    </div>

    <div class="ms-auto flex items-center gap-1.5 sm:gap-2">
      <!-- Chaos Index - Desktop only, in first row -->
      {#if isSubscriber && experimental.showChaosIndex && chaosIndex && chaosIndex.score > 0}
        <div class="hidden sm:block">
          <ChaosIndex
            score={chaosIndex.score}
            summary={chaosIndex.summary}
            lastUpdated={chaosIndex.lastUpdated}
            bind:open={chaosModalOpen}
            onOpenChange={onChaosModalChange}
          />
        </div>
      {/if}

      <!-- Time Travel button - available for everyone during beta -->
      <button
        onclick={() => timeTravel.toggle()}
        title={s("header.timeTravel") || "Time Travel"}
        aria-label={s("header.timeTravel") || "Time Travel"}
        class="p-1 sm:w-8 sm:h-8 sm:flex sm:items-center sm:justify-center sm:rounded-lg sm:hover:bg-gray-100 sm:dark:hover:bg-gray-800"
        type="button"
      >
        <IconClock size={24} stroke={1.5} class="text-gray-600 dark:text-gray-400" />
      </button>

      <button
        onclick={onSearchClick}
        title={searchTooltip}
        aria-label={s("header.search") || "Search"}
        class="p-1 sm:w-8 sm:h-8 sm:flex sm:items-center sm:justify-center sm:rounded-lg sm:hover:bg-gray-100 sm:dark:hover:bg-gray-800"
        type="button"
      >
        <IconSearch size={24} stroke={1.5} class="text-gray-600 dark:text-gray-400" />
      </button>

      <button
        onclick={toggleFontSize}
        title={s("header.fontSize") || "Font Size"}
        aria-label={s("header.fontSize") || "Font Size"}
        class="p-1 sm:w-8 sm:h-8 sm:flex sm:items-center sm:justify-center sm:rounded-lg sm:hover:bg-gray-100 sm:dark:hover:bg-gray-800"
        type="button"
      >
        <IconTextSize size={24} stroke={1.5} class="text-gray-600 dark:text-gray-400" />
      </button>

      <button
        onclick={() => {
          settingsModalState.isOpen = true;
          document.body.classList.add('overflow-hidden');
        }}
        title={s("header.settings") || "Settings"}
        aria-label={s("header.settings") || "Settings"}
        class="p-1 sm:w-8 sm:h-8 sm:flex sm:items-center sm:justify-center sm:rounded-lg sm:hover:bg-gray-100 sm:dark:hover:bg-gray-800"
        type="button"
      >
        <IconSettings size={24} stroke={1.5} class="text-gray-600 dark:text-gray-400" />
      </button>

      <!-- Divider -->
      <div class="h-[25px] flex items-center justify-center">
        <div class="w-px h-full bg-gray-200 dark:bg-gray-700"></div>
      </div>

      <!-- App Navigation -->
      <AppNavigation />
    </div>
  </div>
</header>

<!-- Flying kite animation -->
{#if showFlyingKite}
  <div
    class="flying-kite-container"
    style="left: {kiteStartPosition.x}px; top: {kiteStartPosition.y}px;"
  >
    <img
      src={themeSettings.isDark ? "/svg/kite_dark.svg" : "/svg/kite.svg"}
      alt=""
      class="flying-kite"
      aria-hidden="true"
    />
  </div>
{/if}

<style>
  .tt-pill-highlight {
    animation: tt-pulse 2s ease-in-out 3;
  }

  @keyframes tt-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>
