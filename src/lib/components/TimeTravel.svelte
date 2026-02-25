<script lang="ts">
import { fade } from 'svelte/transition';
import Portal from 'svelte-portal';
import { s } from '$lib/client/localization.svelte';
import { languageSettings } from '$lib/data/settings.svelte.js';
import { timeTravelNavigationService } from '$lib/services/timeTravelNavigationService';
import { timeTravel } from '$lib/stores/timeTravel.svelte.js';
import { createModalBehavior } from '$lib/utils/modalBehavior.svelte';
import BetaLabel from './BetaLabel.svelte';

interface BatchInfo {
	id: string;
	createdAt: string;
	language: string;
	totalStories: number;
	time: string;
	dateSlug: string;
}

interface DayBatches {
	[date: string]: BatchInfo[];
}

// Modal behavior
const modal = createModalBehavior();

// Component state
let currentMonth = $state(new Date());
let loading = $state(false);
let monthBatches = $state<DayBatches>({});
let selectedDayBatches = $state<BatchInfo[]>([]);
let showBatchSelector = $state(false);
let showYearPicker = $state(false);

// Define reasonable date boundaries
const MIN_DATE = new Date(2024, 0, 1); // January 1, 2024
const MAX_DATE = new Date(); // Today
// Set MAX_DATE to end of today to avoid timezone issues
MAX_DATE.setHours(23, 59, 59, 999);

// Calculate calendar days
const calendarDays = $derived.by(() => {
	const year = currentMonth.getFullYear();
	const month = currentMonth.getMonth();
	const firstDay = new Date(year, month, 1, 12, 0, 0); // Set to noon to avoid timezone issues
	const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
	const startDate = new Date(firstDay);
	startDate.setDate(startDate.getDate() - firstDay.getDay());

	const days = [];
	const endDate = new Date(lastDay);
	endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

	for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
		// Create a new date at noon to avoid timezone issues
		const dayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
		days.push(dayDate);
	}

	return days;
});

// Month/year display
const monthYearDisplay = $derived(
	new Intl.DateTimeFormat(languageSettings.ui, {
		month: 'long',
		year: 'numeric',
	}).format(currentMonth),
);

// Weekday headers
const weekdayHeaders = $derived.by(() => {
	const formatter = new Intl.DateTimeFormat(languageSettings.ui, {
		weekday: 'short',
	});
	const days = [];
	for (let i = 0; i < 7; i++) {
		const date = new Date(2024, 0, i + 7); // Start from Sunday
		days.push(formatter.format(date));
	}
	return days;
});

// Load batches for current month
async function loadMonthBatches() {
	loading = true;
	try {
		const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
		const endOfMonth = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth() + 1,
			0,
			23,
			59,
			59,
		);

		const lang = languageSettings.getLanguageForAPI();
		const response = await fetch(
			`/api/batches?from=${startOfMonth.toISOString()}&to=${endOfMonth.toISOString()}&lang=${lang}`,
		);

		if (!response.ok) throw new Error('Failed to load batches');

		const data = await response.json();

		// Group batches by date
		const grouped: DayBatches = {};
		for (const batch of data.batches) {
			const date = new Date(batch.createdAt);
			const dateKey = date.toISOString().split('T')[0];
			const timeStr = date.toLocaleTimeString(languageSettings.ui, {
				hour: '2-digit',
				minute: '2-digit',
			});

			if (!grouped[dateKey]) {
				grouped[dateKey] = [];
			}

			grouped[dateKey].push({
				id: batch.id,
				createdAt: batch.createdAt,
				language: batch.language,
				totalStories: batch.totalClusters,
				time: timeStr,
				dateSlug: batch.dateSlug,
			});
		}

		// Sort batches within each day by time (newest first)
		for (const dateKey in grouped) {
			grouped[dateKey].sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);
		}

		monthBatches = grouped;
	} catch (error) {
		console.error('Error loading batches:', error);
	} finally {
		loading = false;
	}
}

// Check if a date has batches
function hasBatches(date: Date): boolean {
	const dateKey = date.toISOString().split('T')[0];
	return monthBatches[dateKey] && monthBatches[dateKey].length > 0;
}

// Get batch count for a date
function getBatchCount(date: Date): number {
	const dateKey = date.toISOString().split('T')[0];
	return monthBatches[dateKey]?.length || 0;
}

// Check if date is today
function isToday(date: Date): boolean {
	const today = new Date();
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	);
}

// Check if date is in current month
function isCurrentMonth(date: Date): boolean {
	return (
		date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()
	);
}

// Check if date is within allowed range
function isDateInRange(date: Date): boolean {
	const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const minDateOnly = new Date(MIN_DATE.getFullYear(), MIN_DATE.getMonth(), MIN_DATE.getDate());
	const maxDateOnly = new Date(MAX_DATE.getFullYear(), MAX_DATE.getMonth(), MAX_DATE.getDate());
	return dateOnly >= minDateOnly && dateOnly <= maxDateOnly;
}

// Check if we can navigate
function canNavigatePrevious(): boolean {
	const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	return prevMonth >= MIN_DATE;
}

function canNavigateNext(): boolean {
	const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	return nextMonth <= MAX_DATE;
}

// Navigate months
function previousMonth() {
	if (!canNavigatePrevious()) return;
	currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	loadMonthBatches();
}

function nextMonth() {
	if (!canNavigateNext()) return;
	currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	loadMonthBatches();
}

async function goToToday() {
	timeTravel.close();
	await timeTravelNavigationService.exitTimeTravel();
}

// Year picker
function selectYear(year: number) {
	currentMonth = new Date(year, currentMonth.getMonth(), 1);
	if (currentMonth < MIN_DATE) {
		currentMonth = new Date(MIN_DATE);
	} else if (currentMonth > MAX_DATE) {
		currentMonth = new Date(MAX_DATE.getFullYear(), MAX_DATE.getMonth(), 1);
	}
	showYearPicker = false;
	loadMonthBatches();
}

// Get available years
const availableYears = $derived.by(() => {
	const years = [];
	for (let year = MIN_DATE.getFullYear(); year <= MAX_DATE.getFullYear(); year++) {
		years.push(year);
	}
	return years;
});

// Handle day selection
function selectDay(date: Date) {
	try {
		const dateKey = date.toISOString().split('T')[0];
		const batches = monthBatches[dateKey];

		if (batches && batches.length === 1) {
			selectBatch(batches[0]);
		} else if (batches && batches.length > 1) {
			selectedDayBatches = batches;
			showBatchSelector = true;
		}
	} catch (error) {
		console.error('Error in selectDay:', error);
	}
}

// Select a specific batch
async function selectBatch(batch: BatchInfo) {
	timeTravel.close();

	try {
		const lang = languageSettings.getLanguageForAPI();
		const latestResponse = await fetch(`/api/batches/latest?lang=${lang}`);
		const latestData = await latestResponse.json();
		const isLatestBatch = latestData.id && latestData.id === batch.id;

		if (isLatestBatch) {
			await timeTravelNavigationService.exitTimeTravel();
		} else {
			await timeTravelNavigationService.enterTimeTravel({
				batchId: batch.id,
				batchDate: batch.createdAt,
				dateSlug: batch.dateSlug,
				reload: true,
			});
		}
	} catch (error) {
		console.error('Error selecting batch:', error);
	}
}

function closeModal() {
	timeTravel.close();
}

// Apply scroll lock
$effect(() => {
	if (timeTravel.isOpen) {
		return modal.applyScrollLock();
	}
});

// Load batches when modal opens
$effect(() => {
	if (timeTravel.isOpen) {
		showBatchSelector = false;
		loadMonthBatches();
	}
});
</script>

<svelte:window onkeydown={(e) => modal.handleKeydown(e, timeTravel.isOpen, closeModal)} />

{#if timeTravel.isOpen}
  <Portal>
    <div
      class="fixed inset-0 z-modal flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onclick={(e) => modal.handleBackdropClick(e, closeModal)}
      onkeydown={(e) => e.key === 'Escape' && closeModal()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-travel-title"
      tabindex="-1"
      transition:fade={{ duration: modal.getTransitionDuration() }}
    >
      <div
        class="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-xl md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-lg dark:bg-gray-800"
        transition:fade={{ duration: modal.getTransitionDuration() }}
      >
        <!-- Header -->
        <div class="flex shrink-0 flex-col border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 id="time-travel-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                {s("timeTravel.title") || "Time Travel"}
              </h2>
              <BetaLabel />
            </div>
            <button
              onclick={closeModal}
              class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 focus-visible-ring touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={s("ui.close") || "Close"}
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
            {#each (s("timeTravel.description") || "Access historical daily summaries.\nReserved for Kagi subscribers.\nAvailable to all users during Beta.").split('\n') as line}
              <p>{line}</p>
            {/each}
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          {#if !showBatchSelector}
            <!-- Month Navigation -->
            <div class="flex items-center justify-between mb-5">
              <button
                onclick={previousMonth}
                disabled={!canNavigatePrevious()}
                class="rounded-full p-2 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center {canNavigatePrevious()
                  ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}"
                aria-label={s("timeTravel.previousMonth") || "Previous month"}
              >
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div class="flex items-center gap-2">
                {#if showYearPicker}
                  <select
                    class="text-base font-semibold text-gray-900 dark:text-white bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currentMonth.getFullYear()}
                    onchange={(e) => selectYear(parseInt(e.currentTarget.value))}
                    onblur={() => (showYearPicker = false)}
                  >
                    {#each availableYears as year}
                      <option value={year}>{year}</option>
                    {/each}
                  </select>
                {:else}
                  <button
                    onclick={() => (showYearPicker = true)}
                    class="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {monthYearDisplay}
                  </button>
                {/if}
                {#if loading}
                  <div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400"></div>
                {/if}
              </div>

              <button
                onclick={nextMonth}
                disabled={!canNavigateNext()}
                class="rounded-full p-2 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center {canNavigateNext()
                  ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}"
                aria-label={s("timeTravel.nextMonth") || "Next month"}
              >
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <!-- Today Button -->
            <div class="flex justify-center mb-5">
              <button
                onclick={goToToday}
                class="px-4 py-2 text-sm font-medium rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                {s("timeTravel.today") || "Go to Today"}
              </button>
            </div>

            <!-- Calendar Grid -->
            {#if loading}
              <div class="flex justify-center items-center h-64">
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"></div>
              </div>
            {:else}
              <div class="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                <div class="grid grid-cols-7 gap-1">
                  <!-- Weekday Headers -->
                  {#each weekdayHeaders as day}
                    <div class="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                      {day}
                    </div>
                  {/each}

                  <!-- Calendar Days -->
                  {#each calendarDays as date}
                    {@const hasBatch = hasBatches(date)}
                    {@const batchCount = getBatchCount(date)}
                    {@const today = isToday(date)}
                    {@const inCurrentMonth = isCurrentMonth(date)}
                    {@const inRange = isDateInRange(date)}

                    <button
                      onclick={() => selectDay(date)}
                      disabled={!hasBatch || !inRange}
                      class="relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all
                        {hasBatch && inRange ? 'hover:bg-white dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default'}
                        {today ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-inset' : ''}
                        {!inCurrentMonth || !inRange ? 'opacity-40' : ''}"
                      aria-label="{date.getDate()} - {batchCount} batches"
                    >
                      <span class="text-sm {hasBatch && inRange ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}">
                        {date.getDate()}
                      </span>

                      {#if hasBatch && inRange}
                        <div class="flex gap-0.5 mt-0.5">
                          {#each Array(Math.min(batchCount, 3)) as _}
                            <div class="size-1 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                          {/each}
                        </div>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Legend -->
              <p class="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                {s("timeTravel.selectDate") || "Select a date to view news from that day"}
              </p>
            {/if}
          {:else}
            <!-- Batch Selector -->
            {@const selectedDate = selectedDayBatches[0] ? new Date(selectedDayBatches[0].createdAt) : new Date()}
            {@const dateStr = new Intl.DateTimeFormat(languageSettings.ui, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(selectedDate)}

            <button
              onclick={() => (showBatchSelector = false)}
              class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 -ms-1 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              {s("common.back") || "Back"}
            </button>

            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {dateStr}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {s("timeTravel.selectBatch") || "Select a news update"}
            </p>

            <div class="space-y-2">
              {#each selectedDayBatches as batch, index}
                {@const batchDate = new Date(batch.createdAt)}
                {@const timeStr = batchDate.toLocaleTimeString(languageSettings.ui, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
                <button
                  onclick={() => selectBatch(batch)}
                  class="w-full p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-start group"
                >
                  <div class="flex justify-between items-center">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <svg class="size-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="font-medium text-gray-900 dark:text-white">
                          {timeStr}
                        </span>
                        {#if index === 0}
                          <span class="text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            {s("timeTravel.latest") || "Latest"}
                          </span>
                        {/if}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        {batch.totalStories} {s("timeTravel.stories") || "stories"}
                      </div>
                    </div>
                    <svg class="size-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Portal>
{/if}
