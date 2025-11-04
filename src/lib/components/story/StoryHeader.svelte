<script lang="ts">
import { getContext } from 'svelte';
import { s } from '$lib/client/localization.svelte';
import { experimental } from '$lib/stores/experimental.svelte.js';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { IconSparkles, IconCards, IconVolume, IconDownload } from '@tabler/icons-svelte';
import Tooltip from '../Tooltip.svelte';
import { containsCJK } from '$lib/utils/textUtils';

// Props
interface Props {
	story: any;
	isRead?: boolean;
	isSharedView?: boolean;
	isExpanded?: boolean;
	onTitleClick?: () => void;
	onReadClick?: (e: Event) => void;
	onFlashcardsClick?: () => void;
	onExportClick?: () => void;
	onDownloadClick?: () => void;
	onTtsClick?: () => void;
	onTtsDownloadClick?: () => void;
	onSimplifyLevelSelect?: (level: 'very-simple' | 'simple' | 'normal') => void;
	citationMapping?: CitationMapping;
	isSimplifying?: boolean;
	selectedLevel?: 'very-simple' | 'simple' | 'normal' | null;
	flashcardMode?: boolean;
	isExporting?: boolean;
	exportedCSV?: { content: string; filename: string } | null;
	selectedWordsCount?: number;
	ttsStatus?: 'idle' | 'loading' | 'playing';
}

let {
	story,
	isRead = false,
	isSharedView = false,
	isExpanded = false,
	onTitleClick,
	onReadClick,
	onFlashcardsClick,
	onExportClick,
	onDownloadClick,
	onTtsClick,
	onTtsDownloadClick,
	onSimplifyLevelSelect,
	citationMapping,
	isSimplifying = false,
	selectedLevel = null,
	flashcardMode = false,
	isExporting = false,
	exportedCSV = null,
	selectedWordsCount = 0,
	ttsStatus = 'idle',
}: Props = $props();

// Toggle state for showing/hiding reading level buttons
let showSimplifySelector = $state(false);

function handleSimplifyToggle() {
	showSimplifySelector = !showSimplifySelector;
}

// Get session from context
const session = getContext<Session | null>('session');

// Check if user is a subscriber
const isSubscriber = $derived(session?.subscription === true);

// Define colors ordered by perceptual distinctness
// These are maximally distinct colors that work well together
const DISTINCT_COLORS = [
	{ name: 'red', light: '#e74c3c', dark: '#ff6b6b' },
	{ name: 'blue', light: '#3498db', dark: '#74b9ff' },
	{ name: 'green', light: '#2ecc71', dark: '#55efc4' },
	{ name: 'purple', light: '#9b59b6', dark: '#a29bfe' },
	{ name: 'orange', light: '#f39c12', dark: '#fdcb6e' },
	{ name: 'teal', light: '#1abc9c', dark: '#00cec9' },
	{ name: 'pink', light: '#e91e63', dark: '#fd79a8' },
	{ name: 'indigo', light: '#3f51b5', dark: '#7986cb' },
	{ name: 'amber', light: '#ff9800', dark: '#ffb74d' },
];

// Generate topic color class using a smarter selection algorithm
function getTopicColorClass(category: string): string {
	// Create a simple hash from the category string
	let hash = 0;
	for (let i = 0; i < category.length; i++) {
		const char = category.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	// Use the hash to select from our distinct colors
	const colorIndex = Math.abs(hash) % DISTINCT_COLORS.length;
	return `topic-color-${colorIndex}`;
}

// Get emoji from story data when experimental settings are enabled
const categoryEmoji = $derived(experimental.showCategoryIcons ? story.emoji : '');
const articleEmoji = $derived(experimental.showArticleIcons ? story.emoji : '');

// Convert title citations to numbered format if mapping is available
const displayTitle = $derived.by(() => {
	if (!citationMapping) return story.title;
	return replaceWithNumberedCitations(story.title, citationMapping);
});

// Check if story contains CJK characters (flashcards don't work for CJK)
const isCJKStory = $derived(containsCJK(story.title));
</script>

<!-- Story Header -->
{#if !isSharedView}
  <header class="mb-1 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div
        class="category-label inline-flex items-center rounded py-1 text-xs text-gray-700 dark:text-gray-300 uppercase"
        role="heading"
        aria-level="3"
        aria-label="Category: {story.category}"
      >
        {#if categoryEmoji}
          <span aria-hidden="true" class="me-1">{categoryEmoji}</span>
        {/if}
        <span class={getTopicColorClass(story.category)} dir="auto">
          {story.category}
        </span>
      </div>

      <!-- AI Tools - Only show when expanded and user is subscriber -->
      {#if isExpanded && isSubscriber}
        <div class="flex items-center gap-1">
          <!-- Sparkles Button with chevron toggle -->
          <Tooltip text={selectedLevel ? s('story.simplify.tooltipActive').replace('{level}', selectedLevel) : s('story.simplify.tooltip')} position="bottom">
            <button
              onclick={handleSimplifyToggle}
              disabled={isSimplifying}
              class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Toggle simplify options"
              aria-expanded={showSimplifySelector}
            >
              <IconSparkles size={16} class={selectedLevel ? "text-blue-500" : "text-gray-500 dark:text-gray-400"} />
            </button>
          </Tooltip>

          <!-- Reading level buttons (shown when expanded) -->
          {#if showSimplifySelector}
            <div role="group" aria-label="Reading level options" class="flex items-center gap-1">
              <button
                onclick={() => onSimplifyLevelSelect?.('very-simple')}
                disabled={isSimplifying}
                class={selectedLevel === 'very-simple' ? 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
                aria-label="Very simple reading level"
                aria-pressed={selectedLevel === 'very-simple'}
                role="button"
              >
                {s('story.simplify.verySimple')}
              </button>
              <button
                onclick={() => onSimplifyLevelSelect?.('simple')}
                disabled={isSimplifying}
                class={selectedLevel === 'simple' ? 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
                aria-label="Simple reading level"
                aria-pressed={selectedLevel === 'simple'}
                role="button"
              >
                {s('story.simplify.simple')}
              </button>
              <button
                onclick={() => onSimplifyLevelSelect?.('normal')}
                disabled={isSimplifying}
                class={selectedLevel === 'normal' ? 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
                aria-label="Normal reading level"
                aria-pressed={selectedLevel === 'normal'}
                role="button"
              >
                {s('story.simplify.normal')}
              </button>
            </div>
          {/if}

          <!-- Flashcard buttons (hidden for CJK stories as word selection doesn't work without spaces) -->
          {#if !isCJKStory}
            {#if exportedCSV}
              <!-- Download button (after export is complete) -->
              <Tooltip text={s('story.flashcards.downloadTooltip')} position="bottom">
                <button
                  onclick={onDownloadClick}
                  class="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-all flex items-center gap-1.5 text-xs font-medium"
                  aria-label="Download flashcards CSV"
                >
                  <IconCards size={16} class="text-blue-600 dark:text-blue-300" />
                  {s('story.flashcards.download')}
                </button>
              </Tooltip>
            {:else}
              <!-- Selection mode buttons -->
              <Tooltip text={flashcardMode ? s('story.flashcards.tooltipExit') : s('story.flashcards.tooltip')} position="bottom">
                <button
                  onclick={onFlashcardsClick}
                  disabled={isExporting}
                  class={`transition-all rounded flex items-center gap-1.5 ${flashcardMode ? 'px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'p-1 hover:bg-gray-100 dark:hover:bg-gray-800'} ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={flashcardMode ? s('story.flashcards.tooltipExit') : s('story.flashcards.tooltip')}
                >
                  <IconCards size={16} class={flashcardMode ? "text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"} />
                  {#if flashcardMode}
                    <span class="text-xs font-medium">
                      {selectedWordsCount > 0 ? s('story.flashcards.selectedCount').replace('{count}', String(selectedWordsCount)) : s('story.flashcards.selectWords')}
                    </span>
                  {/if}
                </button>
              </Tooltip>

              <!-- Export button (only visible when words are selected and not exporting) -->
              {#if flashcardMode && selectedWordsCount > 0 && !isExporting}
                <Tooltip text={s('story.flashcards.exportTooltip')} position="bottom">
                  <button
                    onclick={onExportClick}
                    class="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 transition-all flex items-center text-xs font-medium"
                    aria-label="Export selected words to Anki"
                  >
                    {s('story.flashcards.export')}
                  </button>
                </Tooltip>
              {/if}

              <!-- Exporting spinner -->
              {#if isExporting}
                <div class="flex items-center gap-2 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 ml-1" role="status" aria-live="polite">
                  <svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{s('story.flashcards.generating')}</span>
                </div>
              {/if}
            {/if}
          {/if}

          {#if ttsStatus === 'loading'}
            <!-- Loading state -->
            <Tooltip text={s('story.tts.tooltipLoading')} position="bottom">
              <button
                onclick={onTtsClick}
                class="p-1 rounded bg-gray-100 dark:bg-gray-800 transition-colors"
                aria-label="Cancel audio loading"
              >
                <svg class="animate-spin h-4 w-4 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </button>
            </Tooltip>
          {:else if ttsStatus === 'playing'}
            <!-- Playing state -->
            <Tooltip text={s('story.tts.tooltipStop')} position="bottom">
              <button
                onclick={onTtsClick}
                class="p-1 rounded bg-blue-100 dark:bg-blue-900 transition-colors"
                aria-label="Stop audio playback"
              >
                <IconVolume size={16} class="text-blue-600 dark:text-blue-300" />
              </button>
            </Tooltip>
          {:else}
            <!-- Idle state -->
            <Tooltip text={s('story.tts.tooltip')} position="bottom">
              <button
                onclick={onTtsClick}
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Read story aloud"
              >
                <IconVolume size={16} class="text-gray-500 dark:text-gray-400" />
              </button>
            </Tooltip>
          {/if}

          <!-- Progress/Status (appears at the end after everything) -->
          {#if isSimplifying}
            <div class="flex items-center gap-2 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 ml-1" role="status" aria-live="polite">
              <svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{s('story.simplify.loading')}</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </header>
{/if}

<!-- Story Title and Read Button -->
<div class="flex items-start">
  <div class="flex-grow">
    <button
      class="dark:text-dark-text mb-2 flex cursor-pointer items-center text-xl text-gray-800 text-start w-full bg-transparent border-none p-0 focus-visible-ring rounded"
      class:font-semibold={!isRead}
      onclick={onTitleClick}
      aria-label="Expand story"
      aria-expanded="false"
    >
      {#if articleEmoji}
        <span aria-hidden="true" class="me-2">{articleEmoji}</span>
      {/if}
      <span dir="auto">{displayTitle}</span>
    </button>
  </div>

  <!-- Read Status Button -->
  {#if !isSharedView}
    <div class="-mt-3 ms-4 flex-shrink-0">
      <button
        onclick={onReadClick}
        class="focus-visible-ring rounded"
        title={s("article.readStatus") || "Mark as read"}
        aria-label={isRead ? "Mark as unread" : "Mark as read"}
      >
        <svg
          class="h-6 w-6"
          class:text-blue-500={isRead}
          class:text-gray-300={!isRead}
          class:dark:text-gray-600={!isRead}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 19 19"
          fill={isRead ? "#7BA3FF" : "currentColor"}
          stroke={isRead ? "#427AFC" : "none"}
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  /* Topic color classes - ordered by perceptual distinctness */
  /* Light mode colors */
  :global(.topic-color-0) {
    color: #e74c3c;
  } /* red */
  :global(.topic-color-1) {
    color: #3498db;
  } /* blue */
  :global(.topic-color-2) {
    color: #2ecc71;
  } /* green */
  :global(.topic-color-3) {
    color: #9b59b6;
  } /* purple */
  :global(.topic-color-4) {
    color: #f39c12;
  } /* orange */
  :global(.topic-color-5) {
    color: #1abc9c;
  } /* teal */
  :global(.topic-color-6) {
    color: #e91e63;
  } /* pink */
  :global(.topic-color-7) {
    color: #3f51b5;
  } /* indigo */
  :global(.topic-color-8) {
    color: #ff9800;
  } /* amber */

  /* Dark mode variants - optimized for better contrast and distinctness */
  :global(.dark .topic-color-0) {
    color: #ff6b6b;
  } /* red */
  :global(.dark .topic-color-1) {
    color: #74b9ff;
  } /* blue */
  :global(.dark .topic-color-2) {
    color: #55efc4;
  } /* green */
  :global(.dark .topic-color-3) {
    color: #a29bfe;
  } /* purple */
  :global(.dark .topic-color-4) {
    color: #fdcb6e;
  } /* orange */
  :global(.dark .topic-color-5) {
    color: #00cec9;
  } /* teal */
  :global(.dark .topic-color-6) {
    color: #fd79a8;
  } /* pink */
  :global(.dark .topic-color-7) {
    color: #7986cb;
  } /* indigo */
  :global(.dark .topic-color-8) {
    color: #ffb74d;
  } /* amber */
</style>
