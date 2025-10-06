<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { OnThisDayEvent } from '$lib/types';

interface Props {
	events: OnThisDayEvent[];
}

let { events }: Props = $props();
</script>

<div class="mb-8">
  <h3 class="mb-4 text-2xl font-bold text-gray-700 dark:text-gray-300">
    {s("onthisday.events") || "Events"}
  </h3>

  {#each events as event, index}
    <div
      class="relative flex flex-col pb-6 before:absolute before:top-[14px] before:bottom-[-16px] before:left-[3px] before:w-[2px] before:bg-[var(--color-header)] before:content-[''] last:pb-0 last:before:content-none md:grid md:grid-cols-[auto_1fr] md:items-start md:justify-items-start md:gap-4"
    >
      <!-- Dot + Year -->
      <div class="flex items-center">
        <!-- Dot -->
        <span
          class="relative z-10 h-2 w-2 rounded-full bg-[var(--color-header)]"
        ></span>
        <!-- Year -->
        <span class="ml-2 pl-2 text-2xl font-bold text-[var(--color-header)]">
          {event.year}
        </span>
      </div>

      <!-- Text -->
      <div class="mt-2 pl-6 md:mt-0 md:pl-0">
        <span class="text-sm text-gray-700 dark:text-gray-300" dir="auto">
          {@html event.content.replace(
            /href=/g,
            'class="underline text-gray-800 hover:text-gray-600 cursor-pointer transition-colors dark:text-gray-200 dark:hover:text-gray-400" href=',
          )}
        </span>
      </div>
    </div>
  {/each}
</div>
