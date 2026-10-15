<script lang="ts">
import { fetchSeed } from '$lib/data/seedLoader';
import { languageSettings } from '$lib/data/settings.svelte.js';
import { dataReloadService } from '$lib/services/dataService';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte.js';
import type { SeedData } from '$lib/types/seed';
import { onMount } from 'svelte';

/*
  Logic-only component. Owns subsequent-load behavior — time-travel batch
  switches and language reloads — both of which fetch a fresh seed and pipe
  it through onSeed (handleDataLoaded). Initial load is handled directly by
  +page.server.ts (SSR) and the script-init handleDataLoaded call in
  +page.svelte; this component does not run on first paint.
*/

interface Props {
	onSeed?: (seed: SeedData) => void;
	currentCategory?: string;
	categoryMap?: Record<string, string>;
}

let { onSeed, currentCategory, categoryMap }: Props = $props();

let hasMounted = $state(false);

async function reloadForBatch(batchId: string | null) {
	const seed = await fetchSeed(globalThis.fetch, {
		batchId: batchId ?? undefined,
		lang: languageSettings.getLanguageForAPI(),
		currentCategory,
		categoryMap,
	});
	if (seed) onSeed?.(seed);
}

onMount(() => {
	hasMounted = true;
	dataReloadService.onReload(async () => {
		await reloadForBatch(timeTravelBatch.batchId);
		// Sync so the time-travel $effect doesn't double-fire for the
		// same batchId that handleDataLoaded just re-set.
		previousBatchId = timeTravelBatch.batchId;
	});
});

// Time-travel watcher: reload when the user picks a different batch.
let previousBatchId: string | null = null;
$effect(() => {
	const currentBatchId = timeTravelBatch.batchId;
	if (!hasMounted || previousBatchId === currentBatchId) {
		previousBatchId = currentBatchId;
		return;
	}
	if (previousBatchId === null) {
		// First observation post-mount — sync without firing a reload.
		previousBatchId = currentBatchId;
		return;
	}
	if (dataReloadService.isReloading()) {
		previousBatchId = currentBatchId;
		return;
	}
	previousBatchId = currentBatchId;
	void reloadForBatch(currentBatchId);
});
</script>
