/**
 * Maps backend language codes (data_lang) to frontend locale codes
 */
export const langToLocale: Record<string, string> = {
	en: 'en',
	de: 'de',
	fr: 'fr',
	es: 'es',
	it: 'it',
	pt: 'pt',
	nl: 'nl',
	sv: 'sv',
	pl: 'pl',
	tr: 'tr',
	ru: 'ru',
	zh: 'zh-Hans',
	ja: 'ja',
	hi: 'hi',
	uk: 'uk',
};

/**
 * Maps short language codes to their full database codes.
 * This handles cases where users might use "zh" but the database stores "zh-Hans".
 */
const apiLanguageNormalization: Record<string, string> = {
	zh: 'zh-Hans', // Map plain "zh" to Simplified Chinese by default
};

/**
 * Normalize a language code from API input to database format.
 * Handles special cases like "zh" -> "zh-Hans".
 * Returns the original code if no normalization is needed.
 */
export function normalizeApiLanguageCode(lang: string): string {
	return apiLanguageNormalization[lang] || lang;
}

/**
 * Get the locale code for a given data language
 */
export function getLocaleFromDataLang(dataLang: string | null): string | undefined {
	if (!dataLang || dataLang === 'default') {
		return undefined;
	}
	return langToLocale[dataLang];
}
