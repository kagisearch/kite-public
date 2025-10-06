<script lang="ts">
import { IconClock, IconSearch } from '@tabler/icons-svelte';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { features } from '$lib/config/features';
import {
	displaySettings,
	experimentalSettings,
	type FontSize,
	languageSettings,
	settings,
	settingsModalState,
	themeSettings,
} from '$lib/data/settings.svelte.js';
import { dataReloadService, dataService } from '$lib/services/dataService';
import { timeTravel } from '$lib/stores/timeTravel.svelte.js';
import ChaosIndex from './ChaosIndex.svelte';

// Props
interface Props {
	totalReadCount?: number;
	totalStoriesRead?: number;
	offlineMode?: boolean;
	getLastUpdated?: () => string;
	chaosIndex?: {
		score: number;
		summary: string;
		lastUpdated: string;
	};
	onSearchClick?: () => void;
}

let {
	totalReadCount = 0,
	totalStoriesRead = 0,
	offlineMode = false,
	getLastUpdated = () => 'Never',
	chaosIndex,
	onSearchClick,
}: Props = $props();

// Date click state for cycling through different stats
let dateClickCount = $state(0);

// Loading state for exiting time travel
let isExitingTimeTravel = $state(false);

// Kite animation state
let showFlyingKite = $state(false);
let kiteStartPosition = $state({ x: 0, y: 0 });

// Platform detection for keyboard shortcut
const isMac =
	browser &&
	(('userAgentData' in navigator && (navigator as any).userAgentData?.platform === 'macOS') ||
		navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);
const searchTooltip = $derived(s('header.search') + (isMac ? ' (⌘K)' : ' (Ctrl+K)'));

function handleLogoClick(event: MouseEvent) {
	// Get the logo element's position
	const logoElement = event.currentTarget as HTMLElement;
	const rect = logoElement.getBoundingClientRect();

	// Set the starting position to the right side of the logo (where newspaper icon is)
	kiteStartPosition = {
		x: rect.left + rect.width * 0.85, // 85% to the right
		y: rect.top + rect.height / 2,
	};

	// Show the flying kite
	showFlyingKite = true;

	// Hide it after 5 seconds (it's off-screen by then)
	setTimeout(() => {
		showFlyingKite = false;
	}, 8000);
}

function handleDateClick() {
	dateClickCount = (dateClickCount + 1) % 5;
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
		return getLastUpdated();
	} else if (dateClickCount === 2) {
		return (
			s('stats.newsToday', { count: totalReadCount.toString() }) || `News today: ${totalReadCount}`
		);
	} else if (dateClickCount === 3) {
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
      class="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg"
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
          // Immediately reset time travel to give instant feedback
          timeTravel.reset();
          dataService.setTimeTravelBatch(null);

          // Show loading state
          isExitingTimeTravel = true;

          try {
            // Trigger a reload of the data
            await dataReloadService.reloadData();
          } finally {
            isExitingTimeTravel = false;
          }
        }}
        class="ms-1 p-0.5"
        aria-label="Exit time travel mode"
        disabled={isExitingTimeTravel}
      >
        <svg
          class="w-3 h-3 text-blue-600 dark:text-blue-400"
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
      class="cursor-pointer text-gray-600 dark:text-gray-400 focus-visible-ring rounded px-1 py-1"
      onclick={handleDateClick}
      onkeydown={handleDateKeydown}
      role="button"
      tabindex="0"
      aria-label="Cycle through date and statistics"
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

<header class="mb-1">
  <!-- First row: Logo, Chaos Index (mobile), and buttons -->
  <div class="flex items-center justify-between relative">
    <div class="flex items-center">
      <img
        src={themeSettings.isDark
          ? "/svg/kagi_news_compact_dark.svg"
          : "/svg/kagi_news_compact.svg"}
        alt={s("app.logo.newsAlt") || "Kite News"}
        class="me-2 h-7 sm:h-8 w-20 sm:w-22 logo relative z-50"
        onclick={handleLogoClick}
        role="presentation"
        style="isolation: isolate;"
      />
    </div>

    <!-- Chaos Index - Mobile: centered in first row -->
    {#if experimentalSettings.isEnabled('showChaosIndex') && chaosIndex && chaosIndex.score > 0}
      <div class="sm:hidden absolute start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2">
        <ChaosIndex
          score={chaosIndex.score}
          summary={chaosIndex.summary}
          lastUpdated={chaosIndex.lastUpdated}
        />
      </div>
    {/if}

    <!-- Date section hidden on mobile, shown on desktop in center -->
    <div
      class="hidden sm:flex absolute start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 items-center"
    >
      {@render dateSection()}
    </div>

    <div class="ms-auto flex items-center space-x-1 sm:space-x-2">
      <!-- Chaos Index - Desktop only, in first row -->
      {#if experimentalSettings.isEnabled('showChaosIndex') && chaosIndex && chaosIndex.score > 0}
        <div class="hidden sm:block">
          <ChaosIndex
            score={chaosIndex.score}
            summary={chaosIndex.summary}
            lastUpdated={chaosIndex.lastUpdated}
          />
        </div>
      {/if}

      <!-- Time Travel button - shown when historical search is enabled -->
      {#if features.historicalSearch}
        <button
          onclick={() => timeTravel.toggle()}
          title={s("header.timeTravel") || "Time Travel"}
          aria-label={s("header.timeTravel") || "Time Travel"}
          class="p-1 sm:ms-2"
          type="button"
        >
          <IconClock size={24} stroke={2} class="text-black dark:text-white" />
        </button>
      {/if}

      <button
        onclick={onSearchClick}
        title={searchTooltip}
        aria-label={s("header.search") || "Search"}
        class="p-1 sm:ms-2"
        type="button"
      >
        <IconSearch size={24} stroke={2} class="text-black dark:text-white" />
      </button>

      <button
        onclick={toggleFontSize}
        title={s("header.fontSize") || "Font Size"}
        aria-label={s("header.fontSize") || "Font Size"}
        class="p-1 sm:ms-2"
        type="button"
      >
        <img
          src="/svg/font-size.svg"
          alt=""
          class="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400 dark:invert"
          aria-hidden="true"
        />
      </button>

      <button
        onclick={() => {
          settingsModalState.isOpen = true;
          document.body.classList.add('overflow-hidden');
        }}
        title={s("header.settings") || "Settings"}
        aria-label={s("header.settings") || "Settings"}
        class="p-1 sm:ms-2"
        type="button"
      >
        <img
          src="/svg/gear.svg"
          alt=""
          class="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400 dark:invert"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>

  <!-- Mobile layout - Date only, centered -->
  <div class="flex sm:hidden items-center justify-center mt-1 px-2">
    {@render dateSection()}
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
