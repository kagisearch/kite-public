export interface SupportedLanguage {
	code: string;
	name: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
	{ code: 'default', name: 'Default' },
	{ code: 'source', name: 'Source' },
	{ code: 'custom', name: 'Custom' },
	{ code: 'en', name: 'English (English)' },
	{ code: 'pt', name: 'Português (Portuguese)' },
	{ code: 'pt-BR', name: 'Português Brasileiro (Brazilian Portuguese)' },
	{ code: 'it', name: 'Italiano (Italian)' },
	{ code: 'fr', name: 'Français (French)' },
	{ code: 'es', name: 'Español (Spanish)' },
	{ code: 'de', name: 'Deutsch (German)' },
	{ code: 'nl', name: 'Nederlands (Dutch)' },
	{ code: 'zh-Hans', name: '简体中文 (Simplified Chinese)' },
	{ code: 'zh-Hant', name: '繁體中文 (Traditional Chinese)' },
	{ code: 'ja', name: '日本語 (Japanese)' },
	{ code: 'hi', name: 'हिन्दी (Hindi)' },
	{ code: 'uk', name: 'Українська (Ukrainian)' },
	{ code: 'ar', name: 'العربية (Arabic)' },
	{ code: 'he', name: 'עברית (Hebrew)' },
	{ code: 'ca', name: 'Català (Catalan)' },
	{ code: 'fi', name: 'Suomi (Finnish)' },
	{ code: 'ko', name: '한국어 (Korean)' },
	{ code: 'lb', name: 'Lëtzebuergesch (Luxembourgish)' },
	{ code: 'nb', name: 'Norsk bokmål (Norwegian Bokmål)' },
	{ code: 'pl', name: 'Polski (Polish)' },
	{ code: 'ru', name: 'Русский (Russian)' },
	{ code: 'sv', name: 'Svenska (Swedish)' },
	{ code: 'th', name: 'ไทย (Thai)' },
	{ code: 'tr', name: 'Türkçe (Turkish)' },
];

/**
 * Languages that were never batch-translated and are only shown in the picker
 * when the `on_demand_translations` feature flag is on. This is NOT the full
 * on-demand population: since the English-only batch switch, every concrete
 * non-English language is served on-demand — see ON_DEMAND_LANGUAGE_CODES.
 */
export const ON_DEMAND_LANGUAGES: SupportedLanguage[] = [{ code: 'et', name: 'Eesti (Estonian)' }];

/** All languages including on-demand ones. */
export const ALL_LANGUAGES: SupportedLanguage[] = [...SUPPORTED_LANGUAGES, ...ON_DEMAND_LANGUAGES];

/** Special picker values that don't name a concrete content language. */
const NON_CONTENT_CODES = new Set(['default', 'source', 'custom']);

/**
 * Languages served via the on-demand path: batch fetches fall back to
 * source-language rows, any stored cluster_translations (full rows on
 * historical batches, SSE-persisted rows on new ones) are layered back on
 * top, and missing content is translated live when a story is expanded.
 *
 * Since the backend stopped batch-translating into anything but English,
 * this is every concrete language except `en`. The languages stay in the
 * picker so historical batches keep rendering their stored translations.
 */
export const ON_DEMAND_LANGUAGE_CODES = new Set(
	ALL_LANGUAGES.map((l) => l.code).filter((code) => code !== 'en' && !NON_CONTENT_CODES.has(code)),
);
