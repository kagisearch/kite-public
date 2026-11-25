<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { appUpdateService } from '$lib/services/appUpdateService.svelte';
import { fly } from 'svelte/transition';

function handleReload() {
	appUpdateService.dismiss();
	window.location.reload();
}
</script>

{#if appUpdateService.visible}
	<aside
		class="fixed bottom-4 left-4 right-4 z-notification sm:left-auto sm:max-w-sm"
		transition:fly={{ y: 100, duration: 350 }}
	>
		<div
			class="relative flex flex-col items-start gap-3 rounded-2xl bg-white dark:bg-zinc-800 px-5 py-4 shadow-lg border border-primary-100 dark:border-zinc-700"
		>
			<button
				type="button"
				onclick={() => appUpdateService.dismiss()}
				aria-label="Dismiss"
				class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center text-primary-400 hover:text-primary-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer"
			>
				<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path
						d="M4 4l8 8M12 4l-8 8"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>
			<img src="/doggo_default.svg" alt="" class="h-12 w-auto" />
			<p class="text-sm font-semibold text-primary dark:text-zinc-100">
				{s('notification.appUpdate.title')}
			</p>
			<p class="text-xs leading-relaxed text-primary-600 dark:text-zinc-400">
				{s('notification.appUpdate.description')}
			</p>
			<button
				onclick={handleReload}
				class="rounded-full bg-yellow-400 px-5 py-1.5 text-sm font-medium text-black hover:bg-yellow-500 transition-colors cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:outline-none"
			>
				{s('notification.appUpdate.reload')}
			</button>
		</div>
	</aside>
{/if}
