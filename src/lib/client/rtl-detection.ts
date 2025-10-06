/**
 * List of RTL (Right-to-Left) language codes
 */
const RTL_LOCALES = [
	'ar', // Arabic
	'he', // Hebrew
	'fa', // Persian/Farsi
	'ur', // Urdu
	'yi', // Yiddish
	'ji', // Yiddish (alternative code)
	'iw', // Hebrew (old code)
	'ku', // Kurdish
	'arc', // Aramaic
	'az', // Azeri
	'dv', // Dhivehi/Maldivian
];

/**
 * Checks if a given locale is RTL
 * @param locale - The locale string (e.g., 'ar', 'ar-SA', 'he-IL')
 * @returns true if the locale is RTL, false otherwise
 */
export function isRtlLocale(locale: string | undefined | null): boolean {
	if (!locale) return false;

	// Extract the base language code (e.g., 'ar' from 'ar-SA')
	const baseLang = locale.split('-')[0].toLowerCase();

	return RTL_LOCALES.includes(baseLang);
}
