<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { displaySettings, settings } from '$lib/data/settings.svelte.js';

// Props
interface Props {
	id?: string;
}

let { id = 'story-count-range' }: Props = $props();

function handleChange(e: Event) {
	const value = parseInt((e.currentTarget as HTMLInputElement).value, 10);
	displaySettings.storyCount = value;
	settings.storyCount.save();
}
</script>

<div class="space-y-2">
  <label
    for={id}
    class="block text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    {s("settings.storyCount.label") || "Stories per category"}: {displaySettings.storyCount}
  </label>
  <input
    {id}
    type="range"
    min="3"
    max="12"
    value={displaySettings.storyCount}
    oninput={handleChange}
    class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
  />
  <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
    <span>3</span>
    <span>12</span>
  </div>
</div>
