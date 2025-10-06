import Mustache from 'mustache';
import { browser } from '$app/environment';
import { s } from '$lib/client/localization.svelte';
import { SUPPORTED_LANGUAGES } from '$lib/constants/languages';
import { dataLanguage } from '$lib/stores/dataLanguage.svelte.js';
import { language, type SupportedLanguage } from '$lib/stores/language.svelte.js';

// Simple cache for locale data - all locales loaded at startup
const localeCache: Map<string, Record<string, unknown>> = new Map();

/**
 * Create a story-specific localization function
 * Auto-syncs to content language when UI language is set to "default"
 */
export function createStoryLocalizer(isExpanded: boolean, storyLanguage?: string) {
	// Determine the actual content language to use
	let contentLanguage: string;

	if (dataLanguage.current === 'default') {
		// When data language is "default", use the story's source language
		contentLanguage = storyLanguage || 'en';
	} else {
		// When a specific data language is selected, use that
		contentLanguage = dataLanguage.current;
	}

	// Check if we should sync (UI language is "default" and story is expanded)
	const shouldSync = language.current === 'default' && isExpanded && contentLanguage;

	return (key: string, view?: Record<string, string> | undefined, strict = false) => {
		// Only sync if conditions are met
		if (!shouldSync) {
			return s(key, view, strict);
		}

		// Use content language strings for story UI when expanded
		const strings = localeCache.get(contentLanguage) || language.currentStrings;
		let value = strings?.[key];

		if (typeof value === 'object') {
			value = value?.text;
		}

		if (!value) return strict ? undefined : key;

		return view ? Mustache.render(value, view) : value;
	};
}

/**
 * Preload all locales when UI language is "default"
 * This ensures story UI elements can be shown in the story's language
 */
export async function preloadAllLocales() {
	if (!browser) return;

	// Get all real language codes (exclude "default" and "source")
	const languages = SUPPORTED_LANGUAGES.filter(
		(lang) => lang.code !== 'default' && lang.code !== 'source',
	).map((lang) => lang.code as SupportedLanguage);

	// Only log if we're actually going to load something
	const languagesToLoad = languages.filter((lang) => !localeCache.has(lang));
	if (languagesToLoad.length === 0) return;

	console.log(`📚 Preloading ${languagesToLoad.length} locales for default UI mode...`);

	// Load all missing locales in parallel
	await Promise.all(
		languagesToLoad.map(async (lang) => {
			try {
				const response = await fetch(`/api/locale/${lang}`);
				if (response.ok) {
					const data = await response.json();
					localeCache.set(lang, data.strings);
				}
			} catch (error) {
				console.warn(`Failed to preload locale for ${lang}:`, error);
			}
		}),
	);

	console.log('✅ All locales preloaded');
}
