<script lang="ts">
// Optional prop to vary the title width for visual interest
interface Props {
	variant?: number;
}

let { variant = 0 }: Props = $props();

// Different title widths to make it look more natural
const titleWidths = ['w-4/5', 'w-3/4', 'w-5/6', 'w-2/3', 'w-11/12', 'w-3/5'];
const titleWidth = $derived(titleWidths[variant % titleWidths.length]);
</script>

<article class="relative py-2 border-b border-gray-200 dark:border-gray-700 animate-pulse">
	<!-- Header with category placeholder -->
	<header class="mb-1 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<!-- Category skeleton -->
			<div class="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
		</div>
	</header>

	<!-- Title and read button row -->
	<div class="flex items-start">
		<div class="flex-grow">
			<!-- Title skeleton - varying width -->
			<div class="mb-2">
				<div class="h-6 {titleWidth} bg-gray-200 dark:bg-gray-700 rounded"></div>
			</div>
		</div>

		<!-- Read status button skeleton -->
		<div class="-mt-3 ms-4 flex-shrink-0">
			<div class="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
		</div>
	</div>
</article>
