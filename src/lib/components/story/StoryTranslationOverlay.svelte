<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { ALL_LANGUAGES } from '$lib/constants/languages';
import TranslationExplainerModal from './TranslationExplainerModal.svelte';
import { IconInfoCircle } from '@tabler/icons-svelte';

interface Props {
	translatedFields: Record<string, unknown>;
	targetLanguage?: string;
	sourceLanguage?: string;
}

let { translatedFields, targetLanguage, sourceLanguage }: Props = $props();

const fieldCount = $derived(Object.keys(translatedFields).length);
let showExplainer = $state(false);

// ALL_LANGUAGES entries look like { code: 'et', name: 'Eesti (Estonian)' } —
// extract the English name in parentheses so the detail sentence reads
// naturally regardless of the user's UI locale.
function humanLanguageName(code: string | undefined): string | null {
	if (!code) return null;
	const entry = ALL_LANGUAGES.find((l) => l.code === code);
	if (!entry) return code.toUpperCase();
	const m = entry.name.match(/\(([^)]+)\)/);
	return m?.[1] ?? entry.name;
}

const sourceName = $derived(humanLanguageName(sourceLanguage));
const targetName = $derived(humanLanguageName(targetLanguage));
const detailText = $derived.by(() => {
	if (!sourceName || !targetName) return null;
	return s('translation.translatingDetail', { source: sourceName, target: targetName }) || null;
});
</script>

<div
	class="py-2 px-3 mb-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
	role="status"
	aria-live="polite"
>
	<div class="flex items-center gap-2">
		<svg
			class="h-4 w-4 animate-spin text-blue-500 flex-shrink-0"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			/>
		</svg>
		<span class="text-sm text-blue-700 dark:text-blue-300">
			{s('translation.translating') || 'Translating'}
			{#if targetLanguage}
				<span class="font-medium">{targetLanguage}</span>
			{/if}
			{#if fieldCount > 0}
				<span class="text-blue-500 dark:text-blue-400">
					({fieldCount}
					{fieldCount === 1
						? s('translation.section') || 'section'
						: s('translation.sections') || 'sections'})
				</span>
			{/if}
		</span>

		<button
			type="button"
			onclick={() => (showExplainer = true)}
			class="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus-visible-ring rounded px-1.5 py-0.5"
			aria-label={s('translation.learnMore') || 'How on-demand translation works'}
		>
			<IconInfoCircle size={14} />
			<span class="hidden sm:inline">
				{s('translation.learnMore') || 'How it works'}
			</span>
		</button>
	</div>

	{#if detailText}
		<p class="mt-1 text-xs text-blue-600/80 dark:text-blue-300/80 leading-relaxed">
			{detailText}
		</p>
	{/if}
</div>

<TranslationExplainerModal
	visible={showExplainer}
	onClose={() => (showExplainer = false)}
	targetLanguageName={targetLanguage}
/>
