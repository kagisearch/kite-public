<script lang="ts">
import { s } from '$lib/client/localization.svelte';

// Props
interface Props {
	viewMode: 'list' | 'map';
	onViewModeChange: (mode: 'list' | 'map') => void;
}

let { viewMode, onViewModeChange }: Props = $props();

function handleListClick() {
	onViewModeChange('list');
}

function handleMapClick() {
	onViewModeChange('map');
}
</script>

<div class="flex items-center space-x-2">
  <!-- List View Button -->
  <button
    onclick={handleListClick}
    class={`flex items-center justify-center p-2 rounded-md transition-colors ${
      viewMode === "list"
        ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    }`}
    aria-label={s("view.list") || "List view"}
    title={s("view.list") || "List view"}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  </button>

  <!-- Map View Button -->
  <button
    onclick={handleMapClick}
    class={`flex items-center justify-center p-2 rounded-md transition-colors ${
      viewMode === "map"
        ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    }`}
    aria-label={s("view.map") || "Map view"}
    title={s("view.map") || "Map view"}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  </button>
</div>
