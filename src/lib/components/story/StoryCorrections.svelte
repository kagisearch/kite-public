<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { languageSettings } from '$lib/data/settings.svelte';
import { kiteDB } from '$lib/db/dexie';
import type { Correction } from '$lib/types';
import { IconChevronDown, IconChevronUp, IconPencil } from '@tabler/icons-svelte';
import { onMount } from 'svelte';
import { slide } from 'svelte/transition';

interface Props {
	corrections: Correction[];
	/** Direction of the story's own text; see StoryCard's fieldDirection. */
	contentDir?: 'ltr' | 'rtl';
	/** Story cluster UUID; used to look up when the user first read it. */
	storyId?: string;
}

let { corrections, storyId, contentDir = 'ltr' }: Props = $props();

let expanded = $state(false);
// ms since epoch — null if the user hasn't read the story (or lookup failed).
let readAt = $state<number | null>(null);

onMount(async () => {
	if (!storyId) return;
	readAt = await kiteDB.getReadTimestamp(storyId);
});

// True when at least one correction was applied AFTER the user read the
// story. Drives the orange highlight + "Corrected after your read" label
// so the reader knows the text they remember may have changed.
const correctedAfterRead = $derived.by(() => {
	if (readAt === null) return false;
	return corrections.some((c) => {
		const applied = new Date(c.appliedAt).getTime();
		return Number.isFinite(applied) && applied > (readAt as number);
	});
});

// Human-readable labels for the snake_case field names on the story JSON.
// Keys mirror EDITABLE_PATH_ROOTS in $lib/server/factCheck/verdict.ts.
const FIELD_LABELS: Record<string, string> = {
	title: 'Headline',
	short_summary: 'Summary',
	did_you_know: 'Did you know',
	talking_points: 'Talking points',
	timeline: 'Timeline',
	perspectives: 'Perspectives',
	geopolitical_context: 'Geopolitical context',
	historical_background: 'Historical background',
	humanitarian_impact: 'Humanitarian impact',
	economic_implications: 'Economic implications',
	future_outlook: 'Future outlook',
	business_angle_text: 'Business angle',
	key_players: 'Key players',
	international_reactions: 'International reactions',
	technical_details: 'Technical details',
	business_angle_points: 'Business angle points',
	user_action_items: 'Action items',
};

function labelForField(key: string): string {
	return FIELD_LABELS[key] ?? key;
}

function formatWhen(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(languageSettings.ui, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

const label = $derived.by(() => {
	if (correctedAfterRead) {
		return (
			(corrections.length === 1
				? s('story.corrections.oneAfterRead')
				: s('story.corrections.manyAfterRead', { count: String(corrections.length) })) ||
			(corrections.length === 1
				? 'Corrected after your read'
				: `${corrections.length} corrections after your read`)
		);
	}
	return (
		(corrections.length === 1
			? s('story.corrections.one')
			: s('story.corrections.many', { count: String(corrections.length) })) ||
		(corrections.length === 1 ? 'Corrected' : `${corrections.length} corrections`)
	);
});
</script>

{#if corrections.length > 0}
	<div class="mt-2 mb-4 text-sm">
		<button
			type="button"
			onclick={() => {
				expanded = !expanded;
			}}
			class="inline-flex items-center gap-1.5 focus-visible-ring rounded {correctedAfterRead
				? 'text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300'
				: 'text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200'}"
			aria-expanded={expanded}
			aria-label={s('story.corrections.toggle') || 'Show correction history'}
		>
			<IconPencil size={14} aria-hidden="true" />
			<span>{label}</span>
			{#if expanded}
				<IconChevronUp size={14} aria-hidden="true" />
			{:else}
				<IconChevronDown size={14} aria-hidden="true" />
			{/if}
		</button>

		{#if expanded}
			<div transition:slide={{ duration: 180 }}>
				<ol class="mt-2 space-y-2">
					{#each corrections as correction}
						{@const appliedAfterRead =
							readAt !== null && new Date(correction.appliedAt).getTime() > readAt}
						<li
							class="border-s-2 ps-3 {appliedAfterRead
								? 'border-orange-300 dark:border-orange-900/60'
								: 'border-primary-100 dark:border-primary-200'}"
						>
							<div class="text-xs text-primary-500 dark:text-primary-400">
								{formatWhen(correction.appliedAt)}
							</div>
							<!-- Story content rendered outside the card's directional
							     wrapper, so it carries its own (KNEWS-453). -->
							<div
								class="mt-0.5 whitespace-pre-wrap text-primary-700 dark:text-primary-200"
								dir={contentDir}
							>
								{correction.note}
							</div>
							{#if correction.changedFields.length > 0}
								<div class="mt-0.5 text-xs text-primary-500 dark:text-primary-400">
									{s('story.corrections.changed') || 'Changed'}:
									{correction.changedFields.map(labelForField).join(', ')}
								</div>
							{/if}
						</li>
					{/each}
				</ol>
				<p class="mt-3 text-xs leading-relaxed text-primary-500 dark:text-primary-400">
					{s('story.corrections.explainer') ||
						'Stories may be revised after publication. The trigger is usually a reader report or our own post-publication fact-checking; the revision is produced by the same kind of AI system that writes the stories, and recorded here for transparency.'}
				</p>
			</div>
		{/if}
	</div>
{/if}
