<script lang="ts">
  import { s } from "$lib/client/localization.svelte";
  import { storyCount } from "$lib/stores/storyCount.svelte.js";

  // Props
  interface Props {
    id?: string;
  }

  const { id = "story-count-range" }: Props = $props();
</script>

<div class="space-y-2">
  <label
    for={id}
    class="block text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    {s("settings.storyCount.label") || "Stories per category"}: {storyCount.current}
  </label>
  <input
    {id}
    type="range"
    min="3"
    max="12"
    value={storyCount.current}
    oninput={(e) => storyCount.set(parseInt(e.currentTarget.value))}
    class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
  />
  <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
    <span>3</span>
    <span>12</span>
  </div>
</div>
