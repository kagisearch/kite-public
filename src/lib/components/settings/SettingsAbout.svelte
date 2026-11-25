<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { settingsModalState, themeSettings } from '$lib/data/settings.svelte.js';
import { keyboardNavigation } from '$lib/stores/keyboardNavigation.svelte';
import { language } from '$lib/stores/language.svelte';
import { IconKeyboard, IconMessage2 } from '@tabler/icons-svelte';

interface Props {
	onShowAbout?: () => void;
}

let { onShowAbout }: Props = $props();

function showKeyboardShortcuts() {
	// Close settings modal first, then show keyboard help
	settingsModalState.isOpen = false;
	// Small delay to allow modal to close
	setTimeout(() => {
		keyboardNavigation.openHelp();
	}, 100);
}

function showAbout() {
	// Push /about to the URL
	window.history.pushState({}, '', '/about');
	if (onShowAbout) onShowAbout();
}

// Map Kite locale codes to App Store badge folder names
const localeToAppStoreBadge: Record<string, string> = {
	ar: 'AR',
	de: 'DE',
	en: 'US',
	es: 'ES',
	fr: 'FR',
	he: 'IL',
	hi: 'IN',
	it: 'IT',
	ja: 'JP',
	nl: 'NL',
	pt: 'PTPT',
	'pt-BR': 'PTBR',
	ru: 'RU',
	uk: 'UA',
	'zh-Hans': 'CN(SC)',
	'zh-Hant': 'HKTW(TC)',
};

// Google Play badges use locale codes directly (ar, de, en, etc.)
const supportedGooglePlayLocales = [
	'ar',
	'de',
	'en',
	'es',
	'fr',
	'he',
	'hi',
	'it',
	'ja',
	'nl',
	'pt',
	'pt-BR',
	'ru',
	'uk',
	'zh-Hans',
	'zh-Hant',
];

// Some locales have extra padding in their badge SVGs and need to be scaled up
const badgesWithExtraPadding = ['en', 'he', 'ja', 'ru'];

// Get the appropriate badges based on current locale and theme
const appStoreBadgeFolder = $derived(localeToAppStoreBadge[language.current] || 'US');
const appStoreBadgeVariant = $derived(themeSettings.theme === 'dark' ? 'white' : 'black');
const appStoreBadgePath = $derived(
	`/badges/app-store/${appStoreBadgeFolder}/${appStoreBadgeVariant}.svg`,
);

const googlePlayLocale = $derived(
	supportedGooglePlayLocales.includes(language.current) ? language.current : 'en',
);
const googlePlayBadgeExt = $derived(
	['pt', 'pt-BR', 'zh-Hans'].includes(googlePlayLocale) ? 'png' : 'svg',
);
const googlePlayBadgePath = $derived(
	`/badges/google-play/${googlePlayLocale}.${googlePlayBadgeExt}`,
);
const googlePlayNeedsScaling = $derived(badgesWithExtraPadding.includes(googlePlayLocale));
</script>

<div class="space-y-6">
	<!-- About Kite -->
	<div class="bg-primary-50 p-6 rounded-xl border border-primary-100">
		<div class="flex flex-col sm:flex-row items-start gap-6">
			<!-- Doggo on the left -->
			<div class="flex-shrink-0">
				<img src="/doggo_default.svg" alt="Kagi Doggo" class="size-24 object-contain" />
			</div>

			<!-- Content on the right -->
			<div class="flex-1 space-y-3">
				<h3 class="text-lg font-semibold text-primary">
					{s('settings.about.aboutKite') || 'About Kite'}
				</h3>
				<p class="text-sm text-primary-700 leading-relaxed">
					{s('settings.about.description') ||
						'Kite is a news aggregator that clusters stories from multiple sources, helping you see different perspectives on the same event. Available in 15+ languages with automatic translation.'}
				</p>
				<button
					onclick={showAbout}
					class="inline-flex items-center gap-1.5 text-sm font-medium text-accent-links hover:opacity-80 transition-colors focus-visible-ring rounded"
				>
					<span>{s('settings.about.learnMore') || 'Learn more'}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>

	<!-- Feedback -->
	<div class="space-y-3">
		<h3 class="text-base font-bold text-primary">
			{s('settings.about.feedback') || 'Feedback'}
		</h3>
		<div class="ps-2">
			<p class="text-sm text-primary-600 mb-3">
				{s('settings.about.feedbackDescription') ||
					'Share ideas, report problems, and vote on what we build next'}
			</p>
			<a
				href="https://kagifeedback.org/t/kagi-news"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white dark:bg-graphite-850 px-4 py-2 text-sm font-medium text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus-visible-ring"
			>
				<IconMessage2 size={18} />
				<span>{s('settings.about.openFeedback') || 'Open Kagi Feedback'}</span>
			</a>
		</div>
	</div>

	<!-- Keyboard Shortcuts -->
	<div class="space-y-3">
		<h3 class="text-base font-bold text-primary">
			{s('settings.about.keyboardShortcuts') || 'Keyboard Shortcuts'}
		</h3>
		<div class="ps-2">
			<p class="text-sm text-primary-600 mb-3">
				{s('settings.about.keyboardDescription') ||
					'Navigate stories and categories using vim-style keyboard shortcuts'}
			</p>
			<button
				onclick={showKeyboardShortcuts}
				class="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white dark:bg-graphite-850 px-4 py-2 text-sm font-medium text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus-visible-ring"
			>
				<IconKeyboard size={18} />
				<span>{s('settings.about.viewShortcuts') || 'View Keyboard Shortcuts'}</span>
				<kbd class="ms-2 px-1.5 py-0.5 text-xs font-semibold bg-primary-50 rounded">?</kbd>
			</button>
		</div>
	</div>

	<!-- API Access -->
	<div class="space-y-3">
		<h3 class="text-base font-bold text-primary">
			{s('settings.about.apiAccess') || 'API Access'}
		</h3>
		<div class="ps-2">
			<p class="text-sm text-primary-600 mb-3">
				{s('settings.about.apiDescription') ||
					'Access Kite news programmatically with our REST API'}
			</p>
			<a
				href="/api-docs"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-purple-700 focus-visible-ring"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
					/>
				</svg>
				<span>{s('settings.about.viewApiDocs') || 'View API Documentation'}</span>
			</a>
		</div>
	</div>

	<!-- Mobile Apps -->
	<div class="space-y-3">
		<h3 class="text-base font-bold text-primary">
			{s('settings.about.mobileApps') || 'Mobile Apps'}
		</h3>
		<div class="ps-2">
			<p class="text-sm text-primary-600 mb-3">
				{s('settings.about.mobileDescription') || 'Get Kite on your mobile device'}
			</p>
			<div class="flex flex-col sm:flex-row gap-3 items-center">
				<!-- iOS App Store Badge (localized + theme-aware) -->
				<a
					href="https://apps.apple.com/us/app/kagi-news/id6748314243"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center hover:opacity-80 transition-opacity focus-visible-ring rounded-lg"
				>
					<img
						src={appStoreBadgePath}
						alt={s('settings.about.downloadIos') || 'Download on the App Store'}
						class="h-[40px] w-auto"
						style="min-width: 120px;"
					/>
				</a>

				<!-- Google Play Badge (localized) -->
				<a
					href="https://play.google.com/store/apps/details?id=com.kagi.news"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center hover:opacity-80 transition-opacity focus-visible-ring rounded-lg"
				>
					<img
						src={googlePlayBadgePath}
						alt={s('settings.about.downloadAndroid') || 'Get it on Google Play'}
						class={googlePlayNeedsScaling ? 'h-[60px] w-auto' : 'h-[40px] w-auto'}
						style="min-width: 120px;"
					/>
				</a>
			</div>
		</div>
	</div>

	<!-- Copyright -->
	<div class="ps-2 pt-4 border-t border-primary-100">
		<p class="text-xs text-primary-600">
			© {new Date().getFullYear()} Kagi Inc.
		</p>
	</div>
</div>
