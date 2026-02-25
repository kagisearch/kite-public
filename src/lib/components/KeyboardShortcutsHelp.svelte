<script lang="ts">
import { fade } from 'svelte/transition';
import { s } from '$lib/client/localization.svelte';
import { keyboardNavigation } from '$lib/stores/keyboardNavigation.svelte';

// Note: Keyboard handling (? and Esc) is done in the parent +page.svelte
// to avoid conflicts with global handlers

// Full help sections - using derived to support reactivity with language changes
const helpSections = $derived([
	{
		title: s('keyboard.section.navigation'),
		shortcuts: [
			{ key: 'j', desc: s('keyboard.action.moveNext') },
			{ key: 'k', desc: s('keyboard.action.movePrevious') },
			{ key: 'gg', desc: s('keyboard.action.jumpFirst') },
			{ key: 'G', desc: s('keyboard.action.jumpLast') },
			{ key: 'h', desc: s('keyboard.action.previousCategory') },
			{ key: 'l', desc: s('keyboard.action.nextCategory') },
			{ key: 'Esc', desc: s('keyboard.action.clearSelection') },
		],
	},
	{
		title: s('keyboard.section.storyActions'),
		shortcuts: [
			{ key: 'Enter', desc: s('keyboard.action.toggleExpand') },
			{ key: 'o', desc: s('keyboard.action.openStory') },
			{ key: 'x', desc: s('keyboard.action.closeStory') },
			{ key: 'm', desc: s('keyboard.action.toggleRead') },
		],
	},
	{
		title: s('keyboard.section.global'),
		shortcuts: [
			{ key: '⌘K', desc: s('keyboard.action.searchMac') },
			{ key: 'Ctrl+K', desc: s('keyboard.action.searchWindows') },
			{ key: '?', desc: s('keyboard.action.toggleHelp') },
		],
	},
]);
</script>

{#if keyboardNavigation.showHelp}
	<!-- Full-screen help overlay -->
	<div
		class="fixed inset-0 z-modal bg-white dark:bg-gray-900 overflow-auto help-page"
		role="dialog"
		aria-modal="true"
		aria-label="Keyboard shortcuts help"
		transition:fade={{ duration: 150 }}
	>
		<div class="max-w-4xl mx-auto px-4 py-8">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					{s('keyboard.help.title')}
				</h1>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{@html s('keyboard.help.closeInstructions', {
						key1: '<kbd class="kbd-key-small">?</kbd>',
						key2: '<kbd class="kbd-key-small">Esc</kbd>'
					})}
				</p>
			</div>

			<!-- Sections -->
			{#each helpSections as section}
				<div class="mb-8">
					<h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
						{section.title}
					</h2>
					<dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
						{#each section.shortcuts as shortcut}
							<div class="flex items-center gap-2">
								<dt class="block">
									<kbd class="kbd-key">
										{shortcut.key}
									</kbd>
								</dt>
								<dd class="block flex-1 text-gray-700 dark:text-gray-300">
									{shortcut.desc}
								</dd>
							</div>
						{/each}
					</dl>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* Help page body text styling */
	.help-page {
		font-family: 'Chivo Mono', monospace;
		font-size: 14px;
		font-feature-settings: "liga" 0;
		font-synthesis: none;
		letter-spacing: -0.025em;
		line-height: 1.5;
	}

	/* kbd element styling */
	.kbd-key {
		padding: 0.25rem 0.5rem;
		background-color: rgb(24, 24, 26);
		color: rgb(250, 250, 250);
		border-radius: 0.25rem;
		font-family: 'Chivo Mono', monospace;
		font-size: 1em;
		font-weight: 600;
		font-feature-settings: "liga" 0;
		font-variation-settings: normal;
	}

	:global(.dark) .kbd-key {
		background-color: rgb(229, 229, 229);
		color: rgb(24, 24, 26);
	}
</style>
