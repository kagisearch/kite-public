<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { FilteredOnThisDayEvent } from '$lib/utils/contentFilter';

interface Props {
	events: FilteredOnThisDayEvent[];
}

let { events }: Props = $props();

// Track which blurred events have been revealed
let revealedEvents = $state(new Set<number>());

function revealEvent(index: number) {
	revealedEvents = new Set([...revealedEvents, index]);
}
</script>

<div class="mb-8">
	<h3 class="mb-4 text-2xl font-bold text-primary-700">
		{s('onthisday.events') || 'Events'}
	</h3>

	{#each events as event, index}
		{@const isBlurred = event._filtered && !revealedEvents.has(index)}
		<div
			class="relative flex flex-col pb-6 before:absolute before:top-[14px] before:bottom-[-16px] before:left-[3px] before:w-[2px] before:bg-[var(--color-header)] before:content-[''] last:pb-0 last:before:content-none md:grid md:grid-cols-[auto_1fr] md:items-start md:justify-items-start md:gap-4 {isBlurred
				? 'cursor-pointer'
				: ''}"
			onclick={isBlurred ? () => revealEvent(index) : undefined}
			onkeydown={isBlurred
				? (e) => {
						if (e.key === 'Enter' || e.key === ' ') revealEvent(index);
					}
				: undefined}
			role={isBlurred ? 'button' : undefined}
			tabindex={isBlurred ? 0 : undefined}
		>
			<div
				class="transition-all duration-200 {isBlurred ? 'blur-lg pointer-events-none' : ''}"
				class:contents={!isBlurred}
			>
				<!-- Dot + Year -->
				<div class="flex items-center">
					<!-- Dot -->
					<span class="relative z-10 h-2 w-2 rounded-full bg-[var(--color-header)]"></span>
					<!-- Year -->
					<span class="ml-2 pl-2 text-2xl font-bold text-[var(--color-header)]">
						{event.year}
					</span>
				</div>

				<!-- Text -->
				<div class="mt-2 pl-6 md:mt-0 md:pl-0">
					<span class="text-sm text-primary-700" dir="auto">
						{@html event.content.replace(
							/href=/g,
							'class="underline text-primary-800 hover:text-primary-600 cursor-pointer transition-colors" href=',
						)}
					</span>
				</div>
			</div>

			{#if isBlurred && event._matchedKeywords && event._matchedKeywords.length > 0}
				<div class="absolute inset-0 z-10 flex items-center justify-center">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-primary-700">
							{s('contentFilter.filteredBecause') || 'Hidden due to filter:'}
						</span>
						{#each event._matchedKeywords.slice(0, 3) as keyword}
							<span
								class="text-xs font-semibold text-primary-800 bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded"
							>
								{keyword}
							</span>
						{/each}
						{#if event._matchedKeywords.length > 3}
							<span class="text-xs text-primary-600">
								+{event._matchedKeywords.length - 3}
							</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
