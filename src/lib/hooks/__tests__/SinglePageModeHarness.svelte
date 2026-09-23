<script lang="ts">
import type { SinglePageMode } from '$lib/data/settings.svelte';
import type { Category } from '$lib/types';
import { useSinglePageMode } from '../useSinglePageMode.svelte';

interface Props {
	singlePageMode: SinglePageMode;
	dataLoaded: boolean;
	orderedCategories: Category[];
	loadStoriesForCategory: (categoryId: string, opts?: { prefetch?: boolean }) => Promise<void>;
}

let {
	singlePageMode = $bindable(),
	dataLoaded = $bindable(),
	orderedCategories,
	loadStoriesForCategory,
}: Props = $props();

useSinglePageMode(() => ({
	isSinglePageMode: singlePageMode !== 'disabled',
	singlePageMode,
	dataLoaded,
	orderedCategories,
	loadStoriesForCategory,
	historyManager: undefined,
	currentCategory: orderedCategories[0]?.id ?? '',
	initialCategoryFromUrl: null,
}));
</script>

<div data-testid="single-page-harness"></div>
