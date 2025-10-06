<script lang="ts">
import { IconLoader2 } from '@tabler/icons-svelte';
import { s } from '$lib/client/localization.svelte';
import type { FilterSuggestion } from '$lib/services/search';

interface Props {
	filters: Array<{ type: string; value: string; display: string }>;
	suggestions: FilterSuggestion[];
	selectedSuggestionIndex: number;
	isLoading: boolean;
	onInput: (text: string, cursorPosition: number) => void;
	onKeydown: (event: KeyboardEvent) => void;
	onApplySuggestion: (suggestion: FilterSuggestion) => void;
	onRemoveFilter: (index: number) => void;
	onFocus?: () => void;
	onBlur?: () => void;
}

let {
	filters,
	suggestions,
	selectedSuggestionIndex,
	isLoading,
	onInput,
	onKeydown,
	onApplySuggestion,
	onRemoveFilter,
	onFocus,
	onBlur,
}: Props = $props();

let inputElement = $state<HTMLDivElement | null>(null);
let suggestionsContainer = $state<HTMLDivElement | null>(null);

// Randomly select a placeholder on mount
const placeholderIndex = Math.floor(Math.random() * 10) + 1;
const placeholder = $derived(
	s(`search.placeholder_${placeholderIndex}`) || 'Let your search take flight...',
);

// Expose the input element to parent
export function getElement() {
	return inputElement;
}

// Expose the text extraction method
export function getTextFromContentEditable() {
	return getTextFromContentEditableInternal();
}

function handleInput() {
	if (!inputElement) return;

	// Don't process input events while applying chips
	// This prevents the chip from being immediately cleared
	const text = getTextFromContentEditableInternal();
	const cursorPosition = getCursorPosition();

	onInput(text, cursorPosition);
}

function handleKeyDown(event: KeyboardEvent) {
	onKeydown(event);
}

function handleSuggestionClick(suggestion: FilterSuggestion) {
	onApplySuggestion(suggestion);
}

function getTextFromContentEditableInternal(): string {
	if (!inputElement) return '';
	// Simple text extraction since filters are separate now
	return inputElement.textContent || '';
}

function getCursorPosition(): number {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return 0;
	return selection.getRangeAt(0).startOffset;
}

function handlePaste(event: ClipboardEvent) {
	event.preventDefault();
	const text = event.clipboardData?.getData('text/plain') || '';
	document.execCommand('insertText', false, text);
}

function handleBeforeInput(event: InputEvent) {
	// Prevent certain input types that could break our chip structure
	if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
		event.preventDefault();
	}
}

// Scroll selected suggestion into view
$effect(() => {
	if (suggestions.length > 0 && suggestionsContainer) {
		const selectedButton = suggestionsContainer.children[selectedSuggestionIndex] as HTMLElement;
		if (selectedButton) {
			selectedButton.scrollIntoView({
				behavior: 'instant',
				block: 'nearest',
			});
		}
	}
});
</script>

<div class="relative">
  <!-- Search Input with Chips -->
  <div class="relative">
    <svg
      class="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>

    <div class="flex items-center flex-wrap gap-2 ps-10 pe-4 py-3">
      <!-- Filter chips -->
      {#each filters as filter, index}
        <span class="filter-chip inline-flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md select-none bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <span class="text-xs opacity-70">{filter.type}:</span>
          <span>{filter.display}</span>
          <button
            type="button"
            onclick={() => onRemoveFilter(index)}
            class="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5"
            aria-label="Remove filter"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </span>
      {/each}
      
      <!-- Text input -->
      <div
        bind:this={inputElement}
        class="flex-1 min-w-[200px] text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0"
        contenteditable="true"
        role="textbox"
        tabindex="0"
        aria-label={s("search.search_news_stories") || "Search news stories"}
        aria-multiline="false"
        {placeholder}
        spellcheck="false"
        oninput={handleInput}
        onkeydown={handleKeyDown}
        onpaste={handlePaste}
        onbeforeinput={handleBeforeInput}
        onfocus={onFocus}
        onblur={onBlur}
      ></div>
    </div>

    <!-- Loading indicator -->
    {#if isLoading}
      <div class="absolute end-3 top-1/2 -translate-y-1/2">
        <IconLoader2 class="w-4 h-4 text-blue-500 animate-spin" />
      </div>
    {/if}
  </div>

  <!-- Filter Suggestions Dropdown -->
  {#if suggestions.length > 0}
    <div
      class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg"
    >
      <div
        bind:this={suggestionsContainer}
        class="py-1 max-h-60 overflow-y-auto"
      >
        {#each suggestions as suggestion, index}
          <button
            class="w-full px-3 py-2 text-start hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group {index ===
            selectedSuggestionIndex
              ? 'bg-gray-100 dark:bg-gray-700'
              : ''}"
            onclick={() => handleSuggestionClick(suggestion)}
            type="button"
          >
            <div class="flex flex-col">
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {suggestion.display}
              </span>
              {#if suggestion.label !== suggestion.display}
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {suggestion.label}
                </span>
              {/if}
            </div>

            {#if suggestion.isFilterType}
              <span
                class="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100"
              >
                filter
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Simple placeholder styling for contenteditable */
  [contenteditable]:empty:before {
    content: attr(placeholder);
    color: #9ca3af;
    pointer-events: none;
  }

  [contenteditable]:focus:empty:before {
    opacity: 0.5;
  }
</style>
