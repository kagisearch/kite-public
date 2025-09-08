<script lang="ts">
  import { s } from "$lib/client/localization.svelte";
  import type { FilterSuggestion } from "$lib/services/search";

  interface Props {
    value: string;
    suggestions: FilterSuggestion[];
    selectedSuggestionIndex: number;
    isLoading: boolean;
    onInput: (text: string, cursorPosition: number) => void;
    onKeydown: (event: KeyboardEvent) => void;
    onApplySuggestion: (suggestion: FilterSuggestion) => void;
    onFocus?: () => void;
    onBlur?: () => void;
  }

  // biome-ignore lint/style/useConst: Svelte bindable props must remain let
  let {
    value = $bindable(),
    suggestions,
    selectedSuggestionIndex,
    isLoading,
    onInput,
    onKeydown,
    onApplySuggestion,
    onFocus,
    onBlur,
  }: Props = $props();

  let inputElement = $state<HTMLDivElement | null>(null);
  let suggestionsContainer = $state<HTMLDivElement | null>(null);

  // Randomly select a placeholder on mount
  const placeholderIndex = Math.floor(Math.random() * 10) + 1;
  const placeholder = $derived(
    s(`search.placeholder_${placeholderIndex}`) ||
      "Let your search take flight...",
  );

  // Expose the input element to parent
  export function getElement() {
    return inputElement;
  }

  function handleInput() {
    if (!inputElement) return;

    const text = getTextFromContentEditable();
    const cursorPosition = getCursorPosition();

    onInput(text, cursorPosition);
  }

  function handleKeyDown(event: KeyboardEvent) {
    onKeydown(event);
  }

  function handleSuggestionClick(suggestion: FilterSuggestion) {
    onApplySuggestion(suggestion);
  }

  function getTextFromContentEditable(): string {
    if (!inputElement) return "";

    let text = "";
    const walker = document.createTreeWalker(
      inputElement,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return NodeFilter.FILTER_ACCEPT;
          }
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).classList.contains("filter-chip")
          ) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        },
      },
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const filterText = (node as Element).getAttribute("data-filter") || "";
        text += filterText;
      }
    }

    return text;
  }

  function getCursorPosition(): number {
    const selection: Selection | null = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    return range.startOffset;
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    // Insert plain text at caret position without using deprecated execCommand
    if (document.activeElement === inputElement) {
      document.execCommand("insertText", false, text);
    }
  }

  function handleBeforeInput(event: InputEvent) {
    // Prevent certain input types that could break our chip structure
    if (
      event.inputType === "insertParagraph" ||
      event.inputType === "insertLineBreak"
    ) {
      event.preventDefault();
    }
  }

  // Scroll selected suggestion into view
  $effect(() => {
    if (suggestions.length > 0 && suggestionsContainer) {
      const selectedButton = suggestionsContainer.children[
        selectedSuggestionIndex
      ] as HTMLElement;
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: "instant",
          block: "nearest",
        });
      }
    }
  });
</script>

<div class="relative">
  <!-- Search Input with Chips -->
  <div class="relative">
    <svg
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
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

    <div
      bind:this={inputElement}
      class="search-input-editable w-full pl-10 pr-4 py-3 text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0 resize-none overflow-hidden min-h-[24px]"
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

    <!-- Loading indicator -->
    {#if isLoading}
      <div class="absolute right-3 top-1/2 -translate-y-1/2">
        <div
          class="animate-spin w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full"
        ></div>
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
            class="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group {index ===
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
  .search-input-editable {
    outline: none;
  }

  .search-input-editable:empty:before {
    content: attr(placeholder);
    color: #9ca3af;
    pointer-events: none;
  }

  .search-input-editable:focus:empty:before {
    content: attr(placeholder);
    opacity: 0.5; /* Show placeholder at 50% opacity when focused */
  }

  /* Filter chips styling */
  :global(.filter-chip) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    margin: 0 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.375rem;
    user-select: none;
    cursor: default;
  }

  /* Prevent divs and paragraphs from being created in contenteditable */
  .search-input-editable :global(div),
  .search-input-editable :global(p),
  .search-input-editable :global(br) {
    display: inline !important;
  }
</style>
