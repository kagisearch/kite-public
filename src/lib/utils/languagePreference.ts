import type { SupportedLanguage } from '$lib/data/settings.svelte';

/**
 * Select the best available language based on user preferences
 *
 * Logic:
 * 1. If preferences list is empty, use 'default'
 * 2. Check if sourceLanguage matches any language in the preferences list
 * 3. If match found, use 'source'
 * 4. Otherwise, use the first language from the preferences list
 *
 * @param preferences - Array of preferred languages in order of preference
 * @param sourceLanguage - The source language of the content (optional)
 * @param availableLanguages - Array of available language codes (optional)
 * @returns The selected language code
 */
export function selectPreferredLanguage(
	preferences: SupportedLanguage[],
	sourceLanguage?: string,
	availableLanguages?: string[],
): SupportedLanguage {
	// If no preferences set, use default
	if (!preferences || preferences.length === 0) {
		return 'default';
	}

	// Remove 'default', 'source', and 'custom' from preferences as they are special values
	const validPreferences = preferences.filter(
		(lang) => lang !== 'default' && lang !== 'source' && lang !== 'custom',
	);

	if (validPreferences.length === 0) {
		return 'default';
	}

	// If sourceLanguage is provided, check if it matches any preference
	if (sourceLanguage) {
		const sourceMatches = validPreferences.some((pref) => pref === sourceLanguage);
		if (sourceMatches) {
			return 'source';
		}
	}

	// If availableLanguages is provided, find the first preference that's available
	if (availableLanguages && availableLanguages.length > 0) {
		for (const pref of validPreferences) {
			if (availableLanguages.includes(pref)) {
				return pref;
			}
		}
	}

	// Default to first preference
	return validPreferences[0];
}

/**
 * Check if we should use 'source' language based on preferences
 */
export function shouldUseSourceLanguage(
	preferences: SupportedLanguage[],
	sourceLanguage?: string,
): boolean {
	if (!sourceLanguage || !preferences || preferences.length === 0) {
		return false;
	}

	const validPreferences = preferences.filter(
		(lang) => lang !== 'default' && lang !== 'source' && lang !== 'custom',
	);
	return validPreferences.some((pref) => pref === sourceLanguage);
}

/**
 * Resolve the actual language to use for API calls based on the current data language setting
 * and user preferences.
 *
 * @param dataLanguageSetting - The current dataLanguage setting ('default', 'source', 'custom', or a specific language)
 * @param contentLanguages - Array of preferred languages (used when dataLanguageSetting is 'custom')
 * @param sourceLanguage - The source language of the content (optional)
 * @returns The language code to use for API calls
 */
export function resolveLanguageForAPI(
	dataLanguageSetting: SupportedLanguage,
	contentLanguages: SupportedLanguage[],
	sourceLanguage?: string,
): SupportedLanguage {
	// If custom mode is selected, use preferences
	if (dataLanguageSetting === 'custom') {
		return selectPreferredLanguage(contentLanguages, sourceLanguage);
	}

	// Otherwise, use the setting directly
	return dataLanguageSetting;
}
