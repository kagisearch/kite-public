export interface SupportedLanguage {
	code: string;
	name: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
	{ code: 'default', name: 'Default' },
	{ code: 'source', name: 'Source' },
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
