<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import type { ReadingLevel } from '$lib/data/settings.svelte';

interface Props {
	readingLevel?: ReadingLevel;
}

let { readingLevel }: Props = $props();

// Get the display text for the reading level
const levelText = $derived.by(() => {
	switch (readingLevel) {
		case 'very-simple':
			return s('story.simplify.verySimple') || 'Very Simple';
		case 'simple':
			return s('story.simplify.simple') || 'Simple';
		default:
			return '';
	}
});
</script>

<div class="animate-pulse space-y-6" role="status" aria-label="Loading simplified content">
	<!-- Loading indicator with reading level -->
	<div class="flex items-center gap-3 py-2">
		<svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
		<span class="text-sm text-gray-600 dark:text-gray-400">
			{#if levelText}
				{s('story.simplify.autoSimplifying')?.replace('{level}', levelText) || `Simplifying to ${levelText}...`}
			{:else}
				{s('story.simplify.loading') || 'Simplifying...'}
			{/if}
		</span>
	</div>

	<!-- Summary skeleton -->
	<div class="space-y-3">
		<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
		<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
		<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
	</div>

	<!-- Image placeholder -->
	<div class="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg"></div>

	<!-- Highlights skeleton (bullet points) -->
	<div class="space-y-4">
		<div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
		<div class="space-y-3 ps-4">
			<div class="flex items-start gap-2">
				<div class="h-2 w-2 mt-2 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
				</div>
			</div>
			<div class="flex items-start gap-2">
				<div class="h-2 w-2 mt-2 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
				</div>
			</div>
			<div class="flex items-start gap-2">
				<div class="h-2 w-2 mt-2 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Quote skeleton -->
	<div class="border-s-4 border-gray-300 dark:border-gray-600 ps-4 py-2">
		<div class="space-y-2">
			<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full italic"></div>
			<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 italic"></div>
		</div>
		<div class="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
	</div>

	<!-- Sources skeleton -->
	<div class="space-y-3">
		<div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
		<div class="flex flex-wrap gap-2">
			<div class="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
			<div class="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
			<div class="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
			<div class="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
		</div>
	</div>

	<span class="sr-only">Loading simplified content...</span>
</div>
