<script lang="ts">
import { toastStore, type Toast } from '$lib/stores/toast.svelte';
import { IconCheck, IconInfoCircle, IconAlertTriangle, IconX } from '@tabler/icons-svelte';

const { toasts } = $derived.by(() => ({ toasts: toastStore.toasts }));

function getIcon(type: Toast['type']) {
	switch (type) {
		case 'success':
			return IconCheck;
		case 'warning':
			return IconAlertTriangle;
		case 'error':
			return IconX;
		case 'info':
		default:
			return IconInfoCircle;
	}
}

function getColorClasses(type: Toast['type']): string {
	switch (type) {
		case 'success':
			return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
		case 'warning':
			return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
		case 'error':
			return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
		case 'info':
		default:
			return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
	}
}
</script>

<!-- Toast Container -->
{#if toasts.length > 0}
	<div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md sm:max-w-sm max-sm:left-4 max-sm:right-4">
		{#each toasts as toast (toast.id)}
			<div
				class="p-4 rounded-lg border shadow-lg backdrop-blur-sm animate-slide-in {getColorClasses(toast.type)}"
				role="alert"
			>
				<div class="flex items-center gap-3">
					<div class="flex-shrink-0 flex items-center">
						<svelte:component this={getIcon(toast.type)} size={20} />
					</div>
					<div class="flex-1 text-sm leading-5">
						{toast.message}
					</div>
					{#if toast.action}
						<button
							type="button"
							class="flex-shrink-0 px-3 py-1 text-sm font-medium rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
							onclick={() => {
								toast.action?.onClick();
								toastStore.dismiss(toast.id);
							}}
						>
							{toast.action.label}
						</button>
					{/if}
					<button
						type="button"
						class="flex-shrink-0 p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
						onclick={() => toastStore.dismiss(toast.id)}
						aria-label="Close"
					>
						<IconX size={16} />
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
@keyframes slide-in {
	from {
		transform: translateX(100%);
		opacity: 0;
	}
	to {
		transform: translateX(0);
		opacity: 1;
	}
}

.animate-slide-in {
	animation: slide-in 0.3s ease-out;
}
</style>