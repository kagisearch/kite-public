import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';

export type SupportedLanguage =
	| 'default'
	| 'source'
	| 'en'
	| 'pt'
	| 'it'
	| 'fr'
	| 'es'
	| 'de'
	| 'nl'
	| 'ja'
	| 'hi'
	| 'uk'
	| 'ar'
	| 'he'
	| 'pt-BR'
	| 'ca'
	| 'fi'
	| 'ko'
	| 'lb'
	| 'nb'
	| 'pl'
	| 'ru'
	| 'zh-Hans'
	| 'zh-Hant'
	| 'sv'
	| 'th'
	| 'tr';

interface LocaleEntry {
	text: string;
	translationContext: string;
}

interface LanguageState {
	current: SupportedLanguage;
	currentStrings: Record<string, LocaleEntry>;
	currentLocale: string;
}

// Initialize language state
const languageState = $state<LanguageState>({
	current: 'default',
	currentStrings: {},
	currentLocale: 'en',
});

// Helper functions
function saveLanguage(language: SupportedLanguage) {
	if (!browser) return;

	// Store "kiteLanguage" for UI language
	localStorage.setItem('kiteLanguage', language);

	// Track change for sync
	if (syncManager) {
		syncManager.trackSettingChange('kiteLanguage', language);
	}
}

function loadLanguage(): SupportedLanguage {
	if (!browser) return 'default';

	const stored = localStorage.getItem('kiteLanguage') as SupportedLanguage;

	// Return stored language or "default" as fallback
	return stored || 'default';
}

// Load locale data from API
async function loadLocaleData(lang: string) {
	if (!browser) return;

	try {
		const response = await fetch(`/api/locale/${lang}`);
		if (response.ok) {
			const data = await response.json();
			languageState.currentStrings = data.strings;
			languageState.currentLocale = data.locale;
		}
	} catch (error) {
		console.warn('Failed to load locale data:', error);
	}
}

function applyLanguage(language: SupportedLanguage) {
	if (!browser) return;

	// Set document language
	if (language !== 'default') {
		document.documentElement.lang = language;
	} else {
		// Use browser default (base language code only for HTML lang attribute)
		const browserLang = navigator.language.split('-')[0];
		document.documentElement.lang = browserLang;
	}

	// Dispatch language change event
	window.dispatchEvent(
		new CustomEvent('language-changed', {
			detail: { language },
		}),
	);
}

// Language store API
export const language = {
	get current() {
		return languageState.current;
	},

	get currentStrings() {
		return languageState.currentStrings;
	},

	set(language: SupportedLanguage) {
		languageState.current = language;
		applyLanguage(language);
		saveLanguage(language);
	},

	init() {
		if (!browser) return;

		const storedLanguage = loadLanguage();
		languageState.current = storedLanguage;
		applyLanguage(storedLanguage);
	},

	initStrings(initialStrings: Record<string, LocaleEntry>) {
		if (!browser) return;

		// Initialize with page data (which already comes in the correct language from server)
		languageState.currentStrings = initialStrings;

		// If current language is not default, load that language's strings immediately
		if (languageState.current !== 'default') {
			loadLocaleData(languageState.current);
		}

		// Watch for language changes
		$effect(() => {
			const lang = languageState.current;

			// For "default", keep using server-provided strings
			if (lang === 'default') {
				languageState.currentStrings = initialStrings;
				languageState.currentLocale = 'en';
				return;
			}

			// For explicit language, load that language's data if it changed
			if (lang !== languageState.currentLocale) {
				loadLocaleData(lang);
			}
		});
	},
};
