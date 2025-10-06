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
 * Get the locale code for a given data language
 */
export function getLocaleFromDataLang(dataLang: string | null): string | undefined {
	if (!dataLang || dataLang === 'default') {
		return undefined;
	}
	return langToLocale[dataLang];
}
