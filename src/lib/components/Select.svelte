<script lang="ts">
import { IconCheck, IconChevronDown, IconChevronUp, IconSearch, IconX } from '@tabler/icons-svelte';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
import { onMount, tick } from 'svelte';
import Portal from 'svelte-portal';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';

// Define the Option type
type Option = {
	value: string;
	label: string;
	gender?: 'M' | 'F' | 'N'; // Optional gender field
	icon?: any; // Optional Tabler icon component
};

let {
	value = $bindable(''),
	options = $bindable<Option[]>([]),
	placeholder = $bindable('Select an option'),
	className = $bindable(''),
	searchable = $bindable(false),
	onChange = $bindable((_selectedValue: string) => {}),
	id = $bindable(''),
	label = $bindable(''),
	hideLabel = $bindable(false),
	height = $bindable('h-10'),
} = $props();

// Internal state
let container: HTMLDivElement;
let dropdown: HTMLDivElement | null = $state(null);
let fieldset: HTMLDivElement | null = $state(null);
let search: HTMLInputElement | null = $state(null);
let isOpen = $state(false);
let filter = $state('');
let uniqueId = $state('');
let overlayScrollbars: OverlayScrollbarsComponent | null = $state(null);
let closeTimeout: number | null = $state(null);

// Generate unique ID for aria attributes
try {
	uniqueId = id || crypto.randomUUID();
} catch (e) {
	console.error(e);
	uniqueId = crypto.getRandomValues(new Uint32Array(36)).toString();
}

// Filtered options based on search filter
let filteredOptions = $derived(
	filter
		? options.filter((option) => option.label.toLowerCase().includes(filter.toLowerCase()))
		: options,
);

// Current selected option
let selectedOption = $derived(options.find((option) => option.value === value));
let displayValue = $derived(selectedOption ? selectedOption.label : placeholder);
let displayGender = $derived(selectedOption?.gender);
let genderClass = $derived(
	displayGender === 'M'
		? 'text-blue-400/70 dark:text-blue-400/80'
		: displayGender === 'F'
			? 'text-pink-400/70 dark:text-pink-400/80'
			: displayGender === 'N'
				? 'text-purple-400/70 dark:text-purple-400/80'
				: '',
);

// Focus an element safely with type checking
function focusElement(element: HTMLElement | null) {
	if (element && typeof element.focus === 'function') {
		element.focus();
	}
}

// Position the dropdown relative to the container when portaled
async function positionDropdown() {
	if (!dropdown || !container) return;

	await tick(); // Wait for DOM to update

	const rect = container.getBoundingClientRect();
	const viewportHeight = window.innerHeight;
	const viewportWidth = window.innerWidth;

	// First set the width to ensure proper height calculation
	dropdown.style.width = `${Math.max(rect.width, 120)}px`; // minimum width of 120px

	// Get dropdown dimensions after setting width
	const dropdownHeight = dropdown.offsetHeight || 300;
	const dropdownWidth = dropdown.offsetWidth || rect.width;

	// Calculate space available below and above
	const spaceBelow = viewportHeight - rect.bottom;
	const spaceAbove = rect.top;

	// Use position above when there's not enough space below
	// or when there's more space above than below and the dropdown doesn't fit below
	const positionAbove =
		(spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) ||
		(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);

	// Set fixed positioning
	dropdown.style.position = 'fixed';

	if (positionAbove) {
		// Position above with 5px gap
		dropdown.style.bottom = `${viewportHeight - rect.top + 5}px`;
		dropdown.style.top = 'auto';
	} else {
		// Position below with 5px gap
		dropdown.style.top = `${rect.bottom + 5}px`;
		dropdown.style.bottom = 'auto';
	}

	// Set horizontal position (default to start-aligned)
	dropdown.style.left = `${rect.left}px`;

	// Adjust if dropdown would go off-screen to the right
	if (rect.left + dropdownWidth > viewportWidth) {
		// Try to align with right edge of container
		const rightAligned = Math.max(0, rect.right - dropdownWidth);
		dropdown.style.left = `${rightAligned}px`;
	}
}

// Handle opening and closing the dropdown
async function toggleDropdown(event?: MouseEvent | KeyboardEvent) {
	if (event) {
		event.preventDefault();
		event.stopPropagation();
	}

	isOpen = !isOpen;

	if (isOpen) {
		// Wait for dropdown to be created and then position it
		await tick();
		positionDropdown();

		// Update parent scroll listeners when dropdown opens
		addParentScrollListeners();

		// Only auto-focus if opened with keyboard (arrow keys or Enter)
		if (event && event instanceof KeyboardEvent) {
			setTimeout(() => {
				if (event.key === 'ArrowUp') {
					// Focus last option for ArrowUp
					const options = fieldset?.querySelectorAll('button[role="option"]');
					if (options && options.length > 0) {
						focusElement(options[options.length - 1] as HTMLElement);
					}
				} else {
					// Focus first option for other keys
					const firstOption = fieldset?.querySelector('button[role="option"]') as HTMLElement;
					if (firstOption) {
						focusElement(firstOption);
					} else if (searchable) {
						// If no options or searchable, focus the search input
						focusElement(search);
					}
				}
			}, 10);
		} else if (searchable) {
			// Always focus search field if searchable (standard pattern)
			setTimeout(() => {
				focusElement(search);
			}, 10);
		}
		// If opened with mouse, leave focus on button
	}
}

// Close dropdown when clicking outside
function handleOutsideClick(event: MouseEvent) {
	// Always check if the dropdown is open first
	if (!isOpen) return;

	// Ignore clicks on the container (button) itself - these are handled by toggleDropdown
	if (container?.contains(event.target as Node)) {
		return;
	}

	// Ignore clicks on the dropdown contents
	if (dropdown?.contains(event.target as Node)) {
		return;
	}

	// If we got here, it's a click outside both the button and dropdown, so close it
	closeDropdown();
}

function closeDropdown(options: { preventFocus?: boolean; preventScroll?: boolean } = {}) {
	isOpen = false;
	filter = '';

	// Only return focus if not prevented and if the select is still visible
	if (!options.preventFocus && isSelectVisible()) {
		setTimeout(() => {
			const button = container?.querySelector('button') as HTMLElement;
			if (button) {
				// Use focus with preventScroll to avoid unwanted scrolling
				button.focus({ preventScroll: true });
			}
		}, 0);
	}
}

// Handle option selection
function handleSelect(option: Option) {
	value = option.value;
	closeDropdown();
	onChange(option.value);
}

// Track parent scroll listeners
let parentScrollListeners: Array<{ element: Element; listener: () => void }> = [];

// Find all scrollable parent elements
function getScrollableParents(element: Element): Element[] {
	const parents: Element[] = [];
	let parent = element.parentElement;

	while (parent && parent !== document.body) {
		const style = window.getComputedStyle(parent);
		const overflow = style.overflow + style.overflowY + style.overflowX;

		// Check if element is scrollable
		if (overflow.includes('scroll') || overflow.includes('auto')) {
			parents.push(parent);
		}

		parent = parent.parentElement;
	}

	return parents;
}

// Check if the select button is actually visible (not just in viewport bounds)
function isSelectVisible(): boolean {
	if (!container) return false;

	const rect = container.getBoundingClientRect();
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

	// First check if it's completely outside viewport
	if (
		rect.bottom <= 0 ||
		rect.top >= viewportHeight ||
		rect.right <= 0 ||
		rect.left >= viewportWidth
	) {
		return false;
	}

	// Check if the element is actually visible by testing a point in the center
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	// Make sure the center point is within viewport
	if (centerX < 0 || centerX >= viewportWidth || centerY < 0 || centerY >= viewportHeight) {
		return false;
	}

	// Use elementFromPoint to check if our container is actually visible at its center
	const elementAtPoint = document.elementFromPoint(centerX, centerY);

	// Check if the element at that point is our container or a child of our container
	return !!(elementAtPoint && (elementAtPoint === container || container.contains(elementAtPoint)));
}

// Add scroll listeners to all parent containers
function addParentScrollListeners() {
	if (!container) return;

	// Remove existing listeners first
	removeParentScrollListeners();

	const scrollableParents = getScrollableParents(container);

	scrollableParents.forEach((parent) => {
		const listener = () => {
			if (isOpen) {
				// Check if select is still visible, close dropdown if not
				if (!isSelectVisible()) {
					closeDropdown({ preventFocus: true });
				} else {
					positionDropdown();
				}
			}
		};

		parent.addEventListener('scroll', listener, { passive: true });
		parentScrollListeners.push({ element: parent, listener });
	});
}

// Remove all parent scroll listeners
function removeParentScrollListeners() {
	parentScrollListeners.forEach(({ element, listener }) => {
		element.removeEventListener('scroll', listener);
	});
	parentScrollListeners = [];
}

// Mount event listeners
onMount(() => {
	// Use mousedown to catch all interactions, including ones on buttons
	document.addEventListener('mousedown', handleOutsideClick);
	window.addEventListener('resize', positionDropdown);

	// Window scroll handler with visibility check
	const windowScrollHandler = () => {
		if (isOpen) {
			if (!isSelectVisible()) {
				closeDropdown({ preventFocus: true });
			} else {
				positionDropdown();
			}
		}
	};
	window.addEventListener('scroll', windowScrollHandler);

	// Add parent scroll listeners
	addParentScrollListeners();

	return () => {
		document.removeEventListener('mousedown', handleOutsideClick);
		window.removeEventListener('resize', positionDropdown);
		window.removeEventListener('scroll', windowScrollHandler);
		removeParentScrollListeners();
		if (closeTimeout) window.clearTimeout(closeTimeout);
	};
});

// Update dropdown position when options change (which affects dropdown size)
$effect(() => {
	if (isOpen) {
		filteredOptions;
		requestAnimationFrame(positionDropdown);
	}
});
</script>

{#if label && !hideLabel}
  <label
    for={`select-button-${uniqueId}`}
    class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
  >
    {label}
  </label>
{:else if label && hideLabel}
  <label for={`select-button-${uniqueId}`} class="sr-only">
    {label}
  </label>
{/if}

<div
  bind:this={container}
  class="relative select-none {className} z-20"
  role="combobox"
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-controls={isOpen ? `select-options-${uniqueId}` : undefined}
  aria-owns={isOpen ? `select-options-${uniqueId}` : undefined}
  aria-label={label || placeholder}
  tabindex="-1"
>
  <button
    type="button"
    class="flex {height} focus-visible:ring-focus-ring w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    id={`select-button-${uniqueId}`}
    aria-labelledby={`select-button-${uniqueId}`}
    onmousedown={(e) => {
      e.stopPropagation();
      toggleDropdown(e);
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") {
        closeDropdown();
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown(e);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();

        if (!isOpen) {
          // Open dropdown (focus handled in toggleDropdown)
          toggleDropdown(e);
        } else {
          // Focus first option
          const firstOption = fieldset?.querySelector(
            'button[role="option"]',
          ) as HTMLElement;
          if (firstOption) {
            focusElement(firstOption);
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();

        if (!isOpen) {
          // Open dropdown (focus handled in toggleDropdown)
          toggleDropdown(e);
        } else {
          // Focus last option
          const options = fieldset?.querySelectorAll('button[role="option"]');
          if (options && options.length > 0) {
            focusElement(options[options.length - 1] as HTMLElement);
          }
        }
      } else if (e.key === "Tab" && isOpen) {
        if (e.shiftKey) {
          // If Shift+Tab, close dropdown and let focus move to previous element
          closeDropdown();
          // Don't prevent default to let browser handle focus movement
        } else {
          // If regular Tab, move focus into the dropdown
          e.preventDefault();
          const firstOption = fieldset?.querySelector(
            'button[role="option"]',
          ) as HTMLElement;
          if (firstOption) {
            focusElement(firstOption);
          }
        }
      }
    }}
  >
    <span
      class="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap {value
        ? 'font-medium'
        : 'text-gray-500 dark:text-gray-400'}"
    >
      {#if selectedOption?.icon}
        {@const IconComponent = selectedOption.icon}
        <IconComponent class="size-4 flex-shrink-0" />
      {/if}
      {displayValue}
      {#if displayGender}
        <span class={genderClass}>
          ({displayGender})
        </span>
      {/if}
    </span>
    <div class="relative h-4 w-4 flex-shrink-0">
      <IconChevronUp class="text-primary-700 absolute top-[-2px] size-3" />
      <IconChevronDown class="text-primary-700 absolute bottom-[-2px] size-3" />
    </div>
  </button>

  {#if isOpen}
    <Portal target="body">
      <div
        bind:this={dropdown}
        class="pointer-events-auto fixed z-[1000] overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700"
        style="min-width: 100px; width: auto; max-height: 300px;"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onmousedown={(e) => e.stopPropagation()}
      >
        {#if searchable}
          <div class="p-3">
            <div class="relative">
              <input
                bind:this={search}
                type="search"
                bind:value={filter}
                class="focus:ring-opacity-50 dark:focus:ring-opacity-30 focus:ring-focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 ps-9 text-sm shadow-sm focus:border-blue-300 focus:ring focus:outline-none dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:focus:border-blue-600"
                placeholder={s("common.search") || "Search"}
                aria-label={s("common.search") || "Search"}
              />
              <div
                class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3"
              >
                <IconSearch class="icon-color-muted size-4" />
              </div>
              {#if filter}
                <button
                  type="button"
                  class="absolute inset-y-0 end-0 flex cursor-pointer items-center pe-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  onmousedown={(e) => {
                    e.stopPropagation();
                    filter = "";
                    focusElement(search);
                  }}
                  aria-label="Clear search"
                >
                  <IconX class="size-4" />
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <div style="max-height: 250px;">
          <OverlayScrollbarsComponent
            bind:this={overlayScrollbars}
            options={{
              scrollbars: {
                autoHide: "leave",
                autoHideDelay: 100,
              },
            }}
          >
            <div
              bind:this={fieldset}
              class="py-1"
              role="listbox"
              id={`select-options-${uniqueId}`}
              aria-labelledby={`select-button-${uniqueId}`}
              style="max-height: 250px;"
              tabindex="-1"
            >
              {#if filteredOptions.length === 0}
                <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {s("common.no_results") || "No results found"}
                </div>
              {:else}
                {#each filteredOptions as option}
                  <button
                    type="button"
                    class="focus-visible:ring-focus-ring relative flex w-full cursor-pointer items-center px-4 py-2 ps-8 text-start text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:bg-gray-600 dark:focus-visible:bg-gray-600"
                    role="option"
                    aria-selected={value === option.value}
                    tabindex="0"
                    onmousedown={(e) => {
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                    onkeydown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDropdown();
                        focusElement(
                          container.querySelector("button") as HTMLElement,
                        );
                      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        e.stopPropagation();

                        const optionButtons = [
                          ...(fieldset?.querySelectorAll(
                            'button[role="option"]',
                          ) || []),
                        ];
                        const currentIndex = optionButtons.indexOf(
                          e.currentTarget as HTMLButtonElement,
                        );

                        // Calculate target index with wrap-around
                        const targetIndex =
                          e.key === "ArrowDown"
                            ? (currentIndex + 1) % optionButtons.length
                            : (currentIndex - 1 + optionButtons.length) %
                              optionButtons.length;

                        // Focus the target option
                        focusElement(optionButtons[targetIndex] as HTMLElement);
                        // Ensure it's visible in the scroll area
                        optionButtons[targetIndex]?.scrollIntoView({
                          block: "nearest",
                        });
                      } else if (e.key === "Tab") {
                        // Handle Tab navigation between options
                        const optionButtons = [
                          ...(fieldset?.querySelectorAll(
                            'button[role="option"]',
                          ) || []),
                        ];
                        const currentIndex = optionButtons.indexOf(
                          e.currentTarget as HTMLButtonElement,
                        );

                        if (e.shiftKey && currentIndex === 0) {
                          // If Shift+Tab on first option, close dropdown and return to button
                          e.preventDefault();
                          closeDropdown();
                          focusElement(
                            container.querySelector("button") as HTMLElement,
                          );
                        } else if (
                          !e.shiftKey &&
                          currentIndex === optionButtons.length - 1
                        ) {
                          // If Tab on last option, close dropdown and let natural tab flow continue
                          closeDropdown();
                          // Don't prevent default to let tab continue naturally
                        } else {
                          // Otherwise let native tab behavior work between options
                          // No need to prevent default
                        }
                      }
                    }}
                  >
                    {#if value === option.value}
                      <span
                        class="absolute start-2 font-normal text-gray-900 dark:text-gray-200"
                      >
                        <IconCheck class="size-5 stroke-[2.5]" />
                      </span>
                    {/if}
                    <span
                      class="flex items-center gap-2 {value === option.value
                        ? 'font-bold'
                        : ''}"
                    >
                      {#if option.icon}
                        {@const IconComponent = option.icon}
                        <IconComponent class="size-4" />
                      {/if}
                      {option.label}
                      {#if option.gender}
                        <span
                          class={option.gender === "M"
                            ? "text-blue-400/70 dark:text-blue-400/80"
                            : option.gender === "F"
                              ? "text-pink-400/70 dark:text-pink-400/80"
                              : "text-purple-400/70 dark:text-purple-400/80"}
                        >
                          ({option.gender})
                        </span>
                      {/if}
                    </span>
                  </button>
                {/each}
              {/if}
            </div>
          </OverlayScrollbarsComponent>
        </div>
      </div>
    </Portal>
  {/if}
</div>

<style>
  /* clears the 'X' from Internet Explorer */
  input[type="search"]::-ms-clear {
    display: none;
    width: 0;
    height: 0;
  }
  input[type="search"]::-ms-reveal {
    display: none;
    width: 0;
    height: 0;
  }

  /* clears the 'X' from Chrome */
  input[type="search"]::-webkit-search-decoration,
  input[type="search"]::-webkit-search-cancel-button,
  input[type="search"]::-webkit-search-results-button,
  input[type="search"]::-webkit-search-results-decoration {
    display: none;
  }

  /* Only add vertical padding to the scrollbar */
  :global(.os-scrollbar.os-scrollbar-vertical) {
    --os-padding-axis: 8px; /* vertical padding (top/bottom) */
  }

  /* Make sure dropdown content respects border radius */
  :global(.os-viewport) {
    overflow: hidden;
  }

  /* Add rounded corners only to the last option */
  button[role="option"]:last-child {
    border-radius: 0 0 0.75rem 0.75rem;
  }
</style>
