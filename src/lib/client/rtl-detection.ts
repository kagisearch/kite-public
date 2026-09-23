/**
 * List of RTL (Right-to-Left) language codes
 */
// Kurdish and Azerbaijani are deliberately absent: CLDR resolves plain `ku`
// and `az` to Latin script, and their RTL variants carry their own codes
// (ckb/sdh, azb) which the script check already catches.
const RTL_LOCALES = [
	'ar', // Arabic
	'he', // Hebrew
	'fa', // Persian/Farsi
	'ur', // Urdu
	'yi', // Yiddish
	'ji', // Yiddish (alternative code)
	'iw', // Hebrew (old code)
	'arc', // Aramaic
	'dv', // Dhivehi/Maldivian
	'ydd', // Eastern Yiddish — Bun resolves no script for it
	'prs', // Dari — likewise
	'pes', // Western Persian
	'ckb', // Sorani Kurdish
	'aeb', // Tunisian Arabic
	'acm', // Iraqi Arabic
	'apc', // Levantine Arabic
	'arq', // Algerian Arabic
	'ary', // Moroccan Arabic
	'arz', // Egyptian Arabic
];

/** Language tags that aren't languages — kite uses these as sentinels. */
const NON_LOCALE_SENTINELS = new Set(['default', 'source', 'custom', 'auto']);

/**
 * Which language a piece of story text is currently in.
 *
 * On-demand translation streams field by field, so `selectedLanguage` is the
 * language the story is heading towards rather than the one already on screen.
 * Judge each field on its own: a field that has arrived is in the target
 * language, one that hasn't is still in the source. Deciding per field also
 * means a stream that stalls or fails part-way leaves every undelivered field
 * correctly laid out, with no dependence on the stream's overall state.
 */
export function resolveFieldLanguage(field: {
	sourceLanguage?: string | null;
	selectedLanguage?: string | null;
	needsTranslation?: boolean;
	translated?: boolean;
}): string | null | undefined {
	if (field.needsTranslation && !field.translated) {
		return field.sourceLanguage;
	}
	// selectedLanguage carries sentinels ('default', 'source') when the
	// category has no resolved source language. They're structurally valid
	// subtags, so they'd shadow the real language rather than falling through.
	const selected = field.selectedLanguage;
	if (!selected || NON_LOCALE_SENTINELS.has(selected.toLowerCase())) {
		return field.sourceLanguage;
	}
	return selected;
}

/** Direction for a single field's text. See resolveFieldLanguage. */
export function resolveFieldDirection(field: {
	sourceLanguage?: string | null;
	selectedLanguage?: string | null;
	needsTranslation?: boolean;
	translated?: boolean;
}): 'ltr' | 'rtl' {
	return isRtlLocale(resolveFieldLanguage(field)) ? 'rtl' : 'ltr';
}

/**
 * Scripts written right-to-left, by ISO 15924 code.
 * `Aran` is Nastaliq — what Urdu maximizes to.
 */
const RTL_SCRIPTS = new Set([
	'Arab',
	'Aran',
	'Hebr',
	'Thaa',
	'Nkoo',
	'Adlm',
	'Syrc',
	'Samr',
	'Mand',
	'Rohg',
	'Yezi',
	'Armi',
	'Phnx',
	'Syre',
	'Syrj',
	'Syrn',
]);

/**
 * Checks if a given locale is RTL
 *
 * Resolved through the tag's script rather than a language list, because story
 * content carries ISO 639-3 codes the list never had — Algerian Arabic arrives
 * as `arq` (KNEWS-453).
 *
 * Script, specifically, and not `getTextInfo()`: production serves SSR with Bun
 * (Dockerfile), whose JSC has no CLDR text-info entry for `arq`, `ary`, `arz`
 * or `apc` and answers `ltr` for all of them — wrong, and truthy, so it would
 * shadow any fallback. `maximize()` resolves the script correctly on both Bun
 * and Node, which is what the unit tests run on.
 *
 * @param locale - The locale string (e.g. 'ar', 'ar-SA', 'he-IL', 'arq')
 * @returns true if the locale is RTL, false otherwise
 */
export function isRtlLocale(locale: string | undefined | null): boolean {
	if (!locale) return false;
	// 'default'/'source' are structurally valid subtags, so Intl happily
	// resolves them to root (ltr) instead of throwing.
	if (NON_LOCALE_SENTINELS.has(locale.toLowerCase())) return false;

	try {
		const script = new Intl.Locale(locale).maximize().script;
		// Only a positive match short-circuits. Returning `RTL_SCRIPTS.has(script)`
		// directly would make the list below unreachable for anything Intl can
		// resolve, which is nearly everything — reintroducing the shadowing this
		// function exists to avoid. Bun resolves no script at all for `ydd` and
		// `prs`, and Node reports `Armi` for `arc`, which is RTL but easy to omit
		// from the set.
		if (script && RTL_SCRIPTS.has(script)) return true;
	} catch {
		// Malformed tag — fall through to the static list.
	}

	// Extract the base language code (e.g. 'ar' from 'ar-SA' or 'ar_SA')
	const baseLang = locale.split(/[-_]/)[0].toLowerCase();

	return RTL_LOCALES.includes(baseLang);
}
