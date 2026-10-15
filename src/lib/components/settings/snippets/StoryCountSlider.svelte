<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { syncKnPrefsCookie } from '$lib/data/knPrefsCookie';
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
	syncKnPrefsCookie();
}
</script>

<div class="space-y-2">
	<label for={id} class="block text-sm font-medium text-primary-700">
		{s('settings.storyCount.label') || 'Stories per category'}: {displaySettings.storyCount}
	</label>
	<input
		{id}
		type="range"
		min="3"
		max="12"
		value={displaySettings.storyCount}
		oninput={handleChange}
		aria-valuemin="3"
		aria-valuemax="12"
		aria-valuenow={displaySettings.storyCount}
		aria-valuetext="{displaySettings.storyCount} {displaySettings.storyCount === 1
			? 'story'
			: 'stories'}"
		class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-primary-100"
	/>
	<div class="flex justify-between text-xs text-primary-600">
		<span>3</span>
		<span>12</span>
	</div>
</div>
