<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { displaySettings, languageSettings, themeSettings } from '$lib/data/settings.svelte.js';
import type { Category, Story } from '$lib/types';
import { IconMessage2 } from '@tabler/icons-svelte';

// Helper function for layout width class
function getContainerWidthClass(): string {
	switch (displaySettings.layoutWidth) {
		case 'wide':
			return 'max-w-4xl';
		case 'full':
			return 'max-w-full';
		default:
			return 'max-w-[732px]';
	}
}

interface Props {
	currentCategory?: string;
	categories?: Category[];
	stories?: Story[];
	onShowAbout?: () => void;
}

let { currentCategory = 'World', categories = [], stories = [], onShowAbout }: Props = $props();

// Handle about click
function handleAboutClick() {
	// Push /about to the URL
	window.history.pushState({}, '', '/about');
	if (onShowAbout) onShowAbout();
}

// Get RSS feed URL - uses the language currently loaded for stories
function getRSSFeedUrl(): string {
	const categoryLower = currentCategory.toLowerCase();

	// Get the language from the first story (all stories in a category use the same language)
	const selectedLanguage = stories[0]?.selectedLanguage;

	// Use the selected language for RSS feed
	if (selectedLanguage && selectedLanguage !== 'en') {
		return `/${categoryLower}_${selectedLanguage}.xml`;
	}

	return `/${categoryLower}.xml`;
}
</script>

<footer class="mt-8 pt-4 pb-8 md:pb-4">
	<div
		class="container mx-auto flex {getContainerWidthClass()} flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-6 px-4"
	>
		<a
			href="https://github.com/kagisearch/kite-public"
			target="_blank"
			title={s('footer.contribute') || 'Contribute to Kagi News'}
			class="flex items-center space-x-2 text-primary-600 hover:text-primary-800"
		>
			<svg
				class="h-5 w-5 text-primary-600"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path
					d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
				/>
			</svg>
			<span style="font-size: var(--footer-label-size, 0.75rem)"
				>{s('footer.contribute') || 'Contribute'}</span
			>
		</a>

		<button
			onclick={handleAboutClick}
			class="flex items-center space-x-2 text-primary-600 hover:text-primary-800"
			title={s('footer.about') || 'About Kagi News'}
		>
			<img src={'/favicon.svg'} alt={s('app.logo.iconAlt') || 'Kagi News'} class="h-5 w-5" />
			<span style="font-size: var(--footer-label-size, 0.75rem)">
				<span class="sm:hidden">{s('footer.aboutMobile') || 'About'}</span>
				<span class="hidden sm:inline">{s('footer.about') || 'About Kagi News'}</span>
			</span>
		</button>

		<a
			href="https://kagifeedback.org/t/kagi-news"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center space-x-2 text-primary-600 hover:text-primary-800"
			title={s('footer.feedback') || 'Share feedback on Kagi News'}
		>
			<IconMessage2 size={20} class="text-primary-600" />
			<span style="font-size: var(--footer-label-size, 0.75rem)"
				>{s('footer.feedback') || 'Feedback'}</span
			>
		</a>

		<a
			href={getRSSFeedUrl()}
			target="_blank"
			class="flex items-center space-x-2 text-primary-600 hover:text-primary-800"
			title={s('footer.rssFeed') || 'RSS feed'}
		>
			<img src="/svg/rss.svg" alt="" class="h-5 w-5 dark:invert" />
			<span style="font-size: var(--footer-label-size, 0.75rem)">
				<span class="sm:hidden">{s('footer.rssFeedMobile') || 'RSS'}</span>
				<span class="hidden sm:inline">{s('footer.rssFeed') || 'RSS Feed'}</span>
			</span>
		</a>
	</div>
</footer>
