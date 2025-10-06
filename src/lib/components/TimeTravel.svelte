<script lang="ts">
// Removed animations for consistency with Settings component
import { s } from '$lib/client/localization.svelte';
import { languageSettings } from '$lib/data/settings.svelte.js';
import { timeTravelNavigationService } from '$lib/services/timeTravelNavigationService';
import { timeTravel } from '$lib/stores/timeTravel.svelte.js';

interface BatchInfo {
	id: string;
	createdAt: string;
	language: string;
	totalStories: number;
	time: string;
}

interface DayBatches {
	[date: string]: BatchInfo[];
}

// Component state
let currentMonth = $state(new Date());
let loading = $state(false);
let monthBatches = $state<DayBatches>({});
let selectedDayBatches = $state<BatchInfo[]>([]);
let showBatchSelector = $state(false);
let showYearPicker = $state(false);
let isSelectingBatch = $state(false);

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

		const response = await fetch(
			`/api/batches?from=${startOfMonth.toISOString()}&to=${endOfMonth.toISOString()}&lang=${languageSettings.data}`,
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
		// Keep the modal open on error
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
	// Compare only the date parts, ignoring time
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
	isSelectingBatch = true;
	try {
		await timeTravelNavigationService.exitTimeTravel();
	} finally {
		isSelectingBatch = false;
		timeTravel.close();
	}
}

// Year picker
function selectYear(year: number) {
	currentMonth = new Date(year, currentMonth.getMonth(), 1);
	// Ensure we're within bounds
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

		if (batches && batches.length > 0) {
			// Always show batch selector to display hourly updates
			selectedDayBatches = batches;
			showBatchSelector = true;
		}
	} catch (error) {
		console.error('Error in selectDay:', error);
	}
}

// Select a specific batch
async function selectBatch(batch: BatchInfo) {
	isSelectingBatch = true;

	try {
		// Check if this is the absolute latest batch by fetching the current latest
		const latestResponse = await fetch(`/api/batches/latest?lang=${languageSettings.data}`);
		const latestData = await latestResponse.json();
		// The API returns the batch directly, not wrapped in a 'batch' property
		const isLatestBatch = latestData.id && latestData.id === batch.id;

		console.log('Selecting batch:', {
			batchId: batch.id,
			latestBatchId: latestData.id,
			isLatestBatch,
		});

		if (isLatestBatch) {
			// For the latest batch, exit time travel mode
			console.log('Going to live mode - resetting time travel');
			await timeTravelNavigationService.exitTimeTravel();
		} else {
			// For all other batches, enter time travel mode
			console.log('Setting time travel mode for batch:', batch.id);
			await timeTravelNavigationService.enterTimeTravel({
				batchId: batch.id,
				batchDate: batch.createdAt,
				reload: true,
			});
		}
	} catch (error) {
		console.error('Error selecting batch:', error);
	} finally {
		isSelectingBatch = false;
		timeTravel.close();
	}
}

// Close modal on escape or backdrop click
function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		timeTravel.close();
	}
}

function handleBackdropClick(event: MouseEvent) {
	if (event.target === event.currentTarget) {
		timeTravel.close();
	}
}

// Load batches when modal opens
$effect(() => {
	if (timeTravel.isOpen) {
		loadMonthBatches();
	}
});
</script>

{#if timeTravel.isOpen}
  <div
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 dark:bg-black/80"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label={s("timeTravel.title") || "Time Travel"}
    tabindex="-1"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 m-4 max-w-md w-full relative"
    >
      <!-- Loading overlay for the modal content -->
      {#if isSelectingBatch}
        <div
          class="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center z-10"
        >
          <div class="flex flex-col items-center gap-3">
            <div
              class="animate-spin h-8 w-8 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"
            ></div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {s("timeTravel.loadingData") || "Loading historical data..."}
            </p>
          </div>
        </div>
      {/if}

      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {s("timeTravel.title") || "Time Travel"}
        </h2>
        <button
          onclick={() => timeTravel.close()}
          class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={s("common.close") || "Close"}
          disabled={isSelectingBatch}
        >
          <svg
            class="w-5 h-5 text-gray-500 dark:text-gray-400"
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

      {#if !showBatchSelector}
        <!-- Month Navigation -->
        <div class="flex items-center justify-between mb-4">
          <button
            onclick={previousMonth}
            disabled={!canNavigatePrevious()}
            class="p-2 rounded-lg transition-colors {canNavigatePrevious()
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'opacity-30 cursor-not-allowed'}"
            aria-label={s("timeTravel.previousMonth") || "Previous month"}
          >
            <svg
              class="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div class="flex items-center gap-2">
            {#if showYearPicker}
              <select
                class="text-lg font-medium text-gray-700 dark:text-gray-300 bg-transparent border-none focus:outline-none cursor-pointer"
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
                class="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {monthYearDisplay}
              </button>
            {/if}
            {#if loading}
              <div
                class="animate-spin h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"
              ></div>
            {/if}
          </div>

          <button
            onclick={nextMonth}
            disabled={!canNavigateNext()}
            class="p-2 rounded-lg transition-colors {canNavigateNext()
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'opacity-30 cursor-not-allowed'}"
            aria-label={s("timeTravel.nextMonth") || "Next month"}
          >
            <svg
              class="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <!-- Today Button -->
        <div class="flex justify-center mb-4">
          <button
            onclick={goToToday}
            class="px-3 py-1 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            {s("timeTravel.today") || "Today"}
          </button>
        </div>

        <!-- Calendar Grid -->
        {#if loading}
          <div class="flex justify-center items-center h-64">
            <div
              class="animate-spin h-8 w-8 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"
            ></div>
          </div>
        {:else}
          <div class="grid grid-cols-7 gap-1">
            <!-- Weekday Headers -->
            {#each weekdayHeaders as day}
              <div
                class="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            {/each}

            <!-- Calendar Days -->
            {#each calendarDays as date}
              {@const hasBatch = hasBatches(date)}
              {@const batchCount = getBatchCount(date)}
              {@const today = isToday(date)}
              {@const currentMonth = isCurrentMonth(date)}
              {@const inRange = isDateInRange(date)}

              <button
                onclick={() => selectDay(date)}
                disabled={!hasBatch || !inRange}
                class="relative p-2 h-10 rounded-lg transition-all
              {hasBatch && inRange
                  ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer'
                  : 'cursor-default'}
              {today ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
              {!currentMonth || !inRange ? 'opacity-30' : ''}"
                aria-label="{date.getDate()} - {batchCount} batches"
              >
                <span
                  class="text-sm {hasBatch && inRange
                    ? 'font-medium text-gray-700 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-600'}"
                >
                  {date.getDate()}
                </span>

                {#if hasBatch && inRange}
                  <div
                    class="absolute bottom-0.5 left-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 flex gap-0.5"
                  >
                    {#each Array(Math.min(batchCount, 3)) as _}
                      <div
                        class="w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400"
                      ></div>
                    {/each}
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Legend -->
        <div class="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          {s("timeTravel.selectDate") ||
            "Select a date to view news from that day"}
        </div>
      {:else}
        {@const selectedDate = selectedDayBatches[0]
          ? new Date(selectedDayBatches[0].createdAt)
          : new Date()}
        {@const dateStr = new Intl.DateTimeFormat(languageSettings.ui, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(selectedDate)}

        <!-- Batch Selector -->
        <div>
          <button
            onclick={() => (showBatchSelector = false)}
            class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {s("common.back") || "Back"}
          </button>

          <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
            {dateStr}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {s("timeTravel.selectBatch") || "Select a news update"}
          </p>

          <div class="space-y-2 max-h-96 overflow-y-auto">
            {#each selectedDayBatches as batch, index}
              {@const batchDate = new Date(batch.createdAt)}
              {@const timeStr = batchDate.toLocaleTimeString(languageSettings.ui, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
              <button
                onclick={() => selectBatch(batch)}
                class="w-full p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left group"
              >
                <div class="flex justify-between items-center">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <svg
                        class="w-4 h-4 text-blue-500 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div class="font-medium text-gray-800 dark:text-gray-200">
                        {timeStr}
                      </div>
                      {#if index === 0}
                        <span
                          class="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded"
                        >
                          {s("timeTravel.latest") || "Latest"}
                        </span>
                      {/if}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {batch.totalStories}
                      {s("timeTravel.stories") || "stories"}
                    </div>
                  </div>
                  <svg
                    class="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
