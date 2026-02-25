<script lang="ts">
import { flip } from 'svelte/animate';
import { dragHandle, dragHandleZone } from 'svelte-dnd-action';
import { s } from '$lib/client/localization.svelte';
import Tooltip from '$lib/components/Tooltip.svelte';
import type { SectionConfig } from '$lib/constants/sections';
import { sections } from '$lib/stores/sections.svelte.js';

// Props
interface Props {
	showHeader?: boolean;
	showResetButton?: boolean;
}

let { showHeader = true, showResetButton = true }: Props = $props();

// Sections State
let sectionItems = $state<(SectionConfig & { id: string })[]>([]);
const flipDurationMs = 200;
let showResetConfirmation = $state(false);

// Initialize sections when store changes
$effect(() => {
	sectionItems = sections.list
		.sort((a, b) => a.order - b.order)
		.map((section) => ({ ...section, id: section.id }));
});

function handleSectionConsider(e: CustomEvent) {
	sectionItems = e.detail.items;
}

function handleSectionFinalize(e: CustomEvent) {
	sectionItems = e.detail.items;
	updateSectionOrder();
}

function updateSectionOrder() {
	sectionItems.forEach((section, index) => {
		sections.setOrder(section.id, index + 1);
	});
}

function toggleSection(sectionId: string) {
	sections.toggleSection(sectionId);
}

function resetToDefaults() {
	sections.reset();
	showResetConfirmation = true;
	setTimeout(() => {
		showResetConfirmation = false;
	}, 1000);
}

function getSectionName(id: string): string {
	const key = `section.${id}`;
	return s(key) || id.charAt(0).toUpperCase() + id.slice(1);
}
</script>

<div class="space-y-4">
  {#if showHeader}
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {s("settings.sections.title") || "Article Sections"}
    </h3>
  {/if}

  <div class:ps-2={showHeader}>
    <div class="mb-3 flex justify-between items-center">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {s("settings.sections.instructions") ||
          "Drag to reorder sections. Toggle to enable/disable."}
      </p>

      <button
        class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 me-2 focus-visible-ring rounded"
        onclick={() =>
          sectionItems.map((section) => sections.toggleSection(section.id))}
        aria-label={s("settings.sections.toggleAll.aria") || "Toggle all article sections on or off"}
      >
        {s("settings.sections.toggleAll") || "Toggle All"}
      </button>
    </div>

    <div
      class="space-y-2"
      use:dragHandleZone={{
        items: sectionItems,
        flipDurationMs,
        type: "section",
        delayTouchStart: true,
        dropTargetStyle: {
          outline: "rgba(59, 130, 246, 0.5) solid 2px",
          outlineOffset: "-1px",
          borderRadius: "0.5rem",
        },
      }}
      onconsider={handleSectionConsider}
      onfinalize={handleSectionFinalize}
    >
      {#each sectionItems as section (section.id)}
        <div
          animate:flip={{ duration: flipDurationMs }}
          class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <div class="flex items-center gap-4">
            <!-- Drag Handle (keyboard: Enter/Space to grab, arrows to move, Enter/Space to drop) -->
            <!-- Using div instead of button because button's native Enter/Space handling conflicts with dragHandle -->
            <div
              role="button"
              tabindex="0"
              class="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 touch-manipulation focus-visible-ring rounded p-1"
              use:dragHandle
              aria-label={s("settings.sections.dragHandle.aria") || `Reorder ${getSectionName(section.id)} section. Press Enter to grab, arrow keys to move, Enter to drop.`}
              aria-roledescription="sortable"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="3" cy="4" r="1" />
                <circle cx="3" cy="8" r="1" />
                <circle cx="3" cy="12" r="1" />
                <circle cx="8" cy="4" r="1" />
                <circle cx="8" cy="8" r="1" />
                <circle cx="8" cy="12" r="1" />
              </svg>
            </div>

            <!-- Section Name -->
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getSectionName(section.id)}
            </span>
          </div>

          <!-- Toggle Switch -->
          {#if section.id === "sources"}
            <div class="flex items-center gap-2">
              <Tooltip
                text={s("settings.sections.sourcesRequired") ||
                  "Sources are always shown to maintain transparency and credibility"}
                position="left"
              >
                <button
                  class="focus-visible-ring relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-blue-600 opacity-60 cursor-not-allowed"
                  role="switch"
                  aria-checked={true}
                  aria-label={`${getSectionName(section.id)} (always enabled)`}
                  disabled
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition ltr:translate-x-6 rtl:-translate-x-6"
                  ></span>
                </button>
              </Tooltip>
            </div>
          {:else}
            <button
              onclick={() => toggleSection(section.id)}
              class="focus-visible-ring relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              class:bg-blue-600={section.enabled}
              class:bg-gray-200={!section.enabled}
              class:dark:bg-gray-600={!section.enabled}
              role="switch"
              aria-checked={section.enabled}
              aria-label={`${s("settings.sections.switch") || "Enable/disable"} ${getSectionName(section.id)}`}
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition"
                class:ltr:translate-x-6={section.enabled}
                class:rtl:-translate-x-6={section.enabled}
                class:ltr:translate-x-1={!section.enabled}
                class:rtl:-translate-x-1={!section.enabled}
              ></span>
            </button>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Reset button -->
    {#if showResetButton}
      <div class="text-center mt-4">
        {#if showResetConfirmation}
          <span
            class="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="inline-block"
            >
              <path
                d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
              />
            </svg>
            {s("settings.sections.orderReset") || "Order reset!"}
          </span>
        {:else}
          <button
            onclick={resetToDefaults}
            class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 focus-visible-ring rounded"
            aria-label={s("settings.sections.resetOrder.aria") || "Reset all sections to default order and visibility"}
          >
            {s("settings.sections.resetOrder") || "Reset to Default Order"}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
