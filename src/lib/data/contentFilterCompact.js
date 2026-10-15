// Shared content-filter compaction logic. Vanilla JS so the same source can
// be both `import`ed by the TypeScript modules in this directory and
// `?raw`-inlined into app.html via transformPageChunk in hooks.server.ts —
// keeping the canonical client-side compaction and the SSR cookie-mirror
// pre-hydration script on a single source of truth.
//
// Do not add browser-only or Svelte-only imports here. The single
// `export { ... }` block at the bottom is the only line stripped during
// the inline injection step, so keep declarations as plain `function`
// statements (not `export function ...`).

/**
 * @typedef {Object} CompactContentFilterOptions
 * @property {string} [presetLanguage]
 *   Fallback language mode used when the input has no `presetLanguage` field.
 *   Typically the current data-language preference; comma-separated values are
 *   coerced to `'custom'` to match the client content-filter store.
 * @property {Set<string>} [presetKeywords]
 *   Set of keywords already provided by the active presets at the canonical
 *   `'default'` language. When supplied, `keywords \ presetKeywords` is used as
 *   a fallback for `customKeywords`. Omit when the preset data isn't
 *   available (e.g. the inline preload script, where inlining the full preset
 *   JSON would balloon every HTML response).
 */

/**
 * Normalize an unknown value into a deduplicated, lowercased string array.
 * Optionally cap the result length.
 *
 * @param {unknown} value
 * @param {number} [limit]
 * @returns {string[]}
 */
function normalizeStrings(value, limit) {
	if (!Array.isArray(value)) return [];
	const seen = new Set();
	const out = [];
	for (const item of value) {
		if (typeof item !== 'string') continue;
		const next = item.trim().toLowerCase();
		if (!next || seen.has(next)) continue;
		seen.add(next);
		out.push(next);
		if (limit && out.length >= limit) break;
	}
	return out;
}

/**
 * Resolve the language mode that preset keywords were written under. A
 * comma-separated `dataLang` means the client is in "custom" language mode —
 * the content-filter store expands presets with that mode rather than the
 * API language list, so SSR must do the same for legacy cookies that pre-date
 * the explicit `presetLanguage` field.
 *
 * @param {unknown} value
 * @param {string} dataLang
 * @returns {string}
 */
function getPresetLanguage(value, dataLang) {
	if (typeof value === 'string') return value;
	return typeof dataLang === 'string' && dataLang.includes(',') ? 'custom' : dataLang || 'default';
}

/**
 * Compact a parsed `kite-content-filter` localStorage object into the shape
 * stored under `contentFilter` inside the kn_prefs cookie. Returns null when
 * the input has no usable filter signal.
 *
 * Both the canonical client-side `compactContentFilterPrefs` and the inline
 * SSR-mirror preload script in app.html call into this function. The only
 * intentional input difference is `options.presetKeywords` — supplied by the
 * canonical path (which has access to the full preset JSON) and omitted by
 * the inline preload script (which doesn't, to keep HTML responses small).
 *
 * @param {unknown} value
 * @param {CompactContentFilterOptions} [options]
 * @returns {Record<string, unknown> | null}
 */
function compactContentFilter(value, options) {
	if (!value || typeof value !== 'object') return null;
	const raw = /** @type {Record<string, unknown>} */ (value);
	const fallbackPresetLanguage =
		(options && typeof options.presetLanguage === 'string' && options.presetLanguage) || 'default';
	const presetKeywordsLookup = options && options.presetKeywords;

	const activePresets = normalizeStrings(raw.activePresets);
	const keywords = normalizeStrings(raw.keywords, 200);
	const explicitCustomKeywords = normalizeStrings(raw.customKeywords, 200);
	const resolvedPresetLanguage = getPresetLanguage(raw.presetLanguage, fallbackPresetLanguage);

	if (activePresets.length === 0 && keywords.length === 0 && explicitCustomKeywords.length === 0) {
		return null;
	}

	/** @type {Record<string, unknown>} */
	const prefs = {
		filterMode: raw.filterMode === 'blur' ? 'blur' : 'hide',
		filterScope:
			raw.filterScope === 'title' || raw.filterScope === 'summary' || raw.filterScope === 'all'
				? raw.filterScope
				: 'all',
		showFilteredCount: typeof raw.showFilteredCount === 'boolean' ? raw.showFilteredCount : true,
	};

	if (activePresets.length === 0) {
		prefs.keywords = keywords.length > 0 ? keywords : explicitCustomKeywords;
		return prefs;
	}

	prefs.activePresets = activePresets;
	prefs.presetLanguage = resolvedPresetLanguage;

	let customKeywords = explicitCustomKeywords;
	if (customKeywords.length === 0 && presetKeywordsLookup) {
		customKeywords = keywords.filter((keyword) => !presetKeywordsLookup.has(keyword)).slice(0, 200);
	}
	if (customKeywords.length > 0) {
		prefs.customKeywords = customKeywords;
	}
	return prefs;
}

export { compactContentFilter, getPresetLanguage, normalizeStrings };
