import { browser } from '$app/environment';
import { KN_PREFS_COOKIE } from '$lib/constants/categories';
import {
	compactContentFilter,
	getPresetLanguage,
	normalizeStrings,
} from '$lib/data/contentFilterCompact';
import communityFilters from '$lib/data/contentFilters.json';
import type { FilterMode, FilterScope, FontSize, SinglePageMode } from './settings.svelte';

/**
 * SSR-side mirror of the user's first-render preferences. Stored as a JSON
 * cookie (`kn_prefs`) so the server can render the user's preferred category,
 * language, display shape, and content filters on first paint without a flash.
 *
 * The cookie is a *one-way mirror* of the canonical localStorage + remote-
 * sync state. localStorage stays the source of truth; the cookie is rewritten
 * whenever localStorage changes (user action OR sync pull). On the SSR side
 * the cookie is read once per request and never written.
 */
export interface KnPrefs {
	/** User's enabled categories in display order. enabled[0] is the SSR target. */
	enabled: string[];
	/** Data language preference (matches languageSettings.data — e.g. 'default', 'it', 'custom'). */
	dataLang: string;
	/** Display preferences that change the first rendered page structure. */
	display?: KnDisplayPrefs;
	/** Content filter preferences needed to render the initial story list. */
	contentFilter?: ParsedKnContentFilterPrefs;
	/**
	 * Experimental feature flags that gate visible header/UI elements during
	 * SSR. Only flags whose value affects the first paint live here — the
	 * full experimental store still lives in localStorage.
	 */
	experimental?: KnExperimentalPrefs;
}

export interface KnExperimentalPrefs {
	showChaosIndex?: boolean;
}

export interface KnDisplayPrefs {
	fontSize?: FontSize;
	storyCount?: number;
	layoutWidth?: 'normal' | 'wide' | 'full';
	categoryHeaderPosition?: 'top' | 'bottom';
	introShown?: boolean;
	singlePageMode?: SinglePageMode;
}

export interface KnContentFilterPrefs {
	keywords?: string[];
	/** Compact preset IDs for cookie storage; expanded to keywords during SSR parsing. */
	activePresets?: string[];
	/** Language mode used when preset keywords were written to localStorage. */
	presetLanguage?: string;
	customKeywords?: string[];
	filterMode?: FilterMode;
	filterScope?: FilterScope;
	showFilteredCount?: boolean;
}

export interface ParsedKnContentFilterPrefs {
	keywords: string[];
	filterMode: FilterMode;
	filterScope: FilterScope;
	showFilteredCount: boolean;
}

export interface ContentFilterPreset {
	id: string;
	keywords: string[] | Record<string, string[]>;
}

/**
 * Parse a kn_prefs cookie value. Returns null on missing/empty/malformed
 * input — callers fall through to the cookieless rendering path in that case.
 */
export function parseKnPrefs(rawCookieValue: string | null | undefined): KnPrefs | null {
	if (!rawCookieValue) return null;
	try {
		const parsed = JSON.parse(decodeURIComponent(rawCookieValue));
		if (
			parsed &&
			typeof parsed === 'object' &&
			Array.isArray(parsed.enabled) &&
			parsed.enabled.every((c: unknown) => typeof c === 'string') &&
			typeof parsed.dataLang === 'string'
		) {
			const prefs: KnPrefs = { enabled: parsed.enabled, dataLang: parsed.dataLang };
			const display = parseDisplayPrefs(parsed.display);
			if (display) {
				prefs.display = display;
			}
			const contentFilter = parseContentFilterPrefs(parsed.contentFilter, parsed.dataLang);
			if (contentFilter) {
				prefs.contentFilter = contentFilter;
			}
			const experimental = parseExperimentalPrefs(parsed.experimental);
			if (experimental) {
				prefs.experimental = experimental;
			}
			return prefs;
		}
	} catch {
		// Fall through to null below
	}
	return null;
}

function parseExperimentalPrefs(value: unknown): KnExperimentalPrefs | null {
	if (!value || typeof value !== 'object') return null;
	const raw = value as Record<string, unknown>;
	const prefs: KnExperimentalPrefs = {};
	if (typeof raw.showChaosIndex === 'boolean') {
		prefs.showChaosIndex = raw.showChaosIndex;
	}
	return Object.keys(prefs).length > 0 ? prefs : null;
}

function parseDisplayPrefs(value: unknown): KnDisplayPrefs | null {
	if (!value || typeof value !== 'object') return null;
	const raw = value as Record<string, unknown>;
	const display: KnDisplayPrefs = {};

	if (typeof raw.storyCount === 'number' && Number.isInteger(raw.storyCount)) {
		display.storyCount = Math.max(3, Math.min(12, raw.storyCount));
	}

	if (
		raw.fontSize === 'xs' ||
		raw.fontSize === 'small' ||
		raw.fontSize === 'normal' ||
		raw.fontSize === 'large' ||
		raw.fontSize === 'xl'
	) {
		display.fontSize = raw.fontSize;
	}

	if (raw.layoutWidth === 'normal' || raw.layoutWidth === 'wide' || raw.layoutWidth === 'full') {
		display.layoutWidth = raw.layoutWidth;
	}

	if (raw.categoryHeaderPosition === 'top' || raw.categoryHeaderPosition === 'bottom') {
		display.categoryHeaderPosition = raw.categoryHeaderPosition;
	}

	if (typeof raw.introShown === 'boolean') {
		display.introShown = raw.introShown;
	}

	if (
		raw.singlePageMode === 'disabled' ||
		raw.singlePageMode === 'sequential' ||
		raw.singlePageMode === 'mixed' ||
		raw.singlePageMode === 'random'
	) {
		display.singlePageMode = raw.singlePageMode;
	}

	return Object.keys(display).length > 0 ? display : null;
}

export function parseContentFilterPrefs(
	value: unknown,
	dataLang: string = 'default',
): ParsedKnContentFilterPrefs | null {
	if (!value || typeof value !== 'object') return null;
	const raw = value as Record<string, unknown>;

	const activePresets = normalizeStrings(raw.activePresets);
	const presetLanguage = getPresetLanguage(raw.presetLanguage, dataLang);
	const explicitKeywords =
		activePresets.length > 0
			? [...normalizeStrings(raw.keywords), ...normalizeStrings(raw.customKeywords)]
			: normalizeStrings(raw.keywords);

	const keywords = [
		...resolvePresetKeywords(activePresets, presetLanguage),
		...explicitKeywords.slice(0, 200),
	];

	if (keywords.length === 0) return null;

	const filterMode: FilterMode = raw.filterMode === 'blur' ? 'blur' : 'hide';
	const filterScope: FilterScope =
		raw.filterScope === 'title' || raw.filterScope === 'summary' || raw.filterScope === 'all'
			? raw.filterScope
			: 'all';

	return {
		keywords: [...new Set(keywords)],
		filterMode,
		filterScope,
		showFilteredCount: typeof raw.showFilteredCount === 'boolean' ? raw.showFilteredCount : true,
	};
}

export function compactContentFilterPrefs(
	value: unknown,
	presetLanguage: string = 'default',
): KnContentFilterPrefs | null {
	const activePresets = normalizeStrings(
		(value && typeof value === 'object' && (value as Record<string, unknown>).activePresets) || [],
	);
	const presetKeywords = new Set(resolvePresetKeywords(activePresets, 'default'));
	return compactContentFilter(value, {
		presetLanguage,
		presetKeywords,
	}) as KnContentFilterPrefs | null;
}

function resolvePresetKeywords(activePresets: string[], dataLang: string): string[] {
	if (activePresets.length === 0) return [];

	const presetsById = new Map(
		(communityFilters.filters as ContentFilterPreset[]).map((preset) => [preset.id, preset]),
	);
	const keywords = new Set<string>();

	for (const presetId of activePresets) {
		const preset = presetsById.get(presetId);
		if (!preset) continue;
		for (const keyword of getContentFilterPresetKeywords(preset, dataLang)) {
			const normalized = keyword.trim().toLowerCase();
			if (normalized) keywords.add(normalized);
		}
	}

	return [...keywords];
}

export function getContentFilterPresetKeywords(
	preset: ContentFilterPreset,
	dataLang: string,
): string[] {
	const presetKeywords = preset.keywords;
	if (Array.isArray(presetKeywords)) return presetKeywords;

	if (dataLang === 'default' || dataLang === 'source') {
		return Object.values(presetKeywords).flat();
	}

	const requestedLanguages = dataLang
		.split(',')
		.map((lang) => lang.trim())
		.filter(Boolean);
	if (requestedLanguages.length > 1) {
		return requestedLanguages.flatMap(
			(lang) => presetKeywords[lang] || presetKeywords.default || presetKeywords.en || [],
		);
	}

	return presetKeywords[dataLang] || presetKeywords.default || presetKeywords.en || [];
}

/**
 * Serialize a KnPrefs object for cookie storage. URL-encoded JSON keeps the
 * value safe for the cookie header.
 */
export function serializeKnPrefs(
	prefs: Omit<KnPrefs, 'contentFilter'> & {
		contentFilter?: KnContentFilterPrefs;
	},
): string {
	return encodeURIComponent(JSON.stringify(prefs));
}

/**
 * Write the kn_prefs cookie from the client. No-op on the server. Called
 * whenever categorySettings.enabled or languageSettings.data changes — keeps
 * the cookie in lockstep with localStorage so the next page load can SSR
 * the user's correct preferences.
 *
 * 1-year expiry, root path, Lax SameSite. Secure when served over HTTPS
 * (skipped in localhost dev). No HttpOnly because this cookie is intentionally
 * client-written — the SSR side only ever reads it.
 *
 * Returns true when the cookie value visible via document.cookie after the
 * write matches what we tried to set. Browsers silently drop oversized cookie
 * writes (typically once the encoded length crosses ~4096 bytes), and we want
 * the caller to be able to react — either by trimming the payload and
 * retrying, or by logging so the staleness is visible instead of mysterious.
 */
export function writeKnPrefsCookie(
	prefs: Omit<KnPrefs, 'contentFilter'> & { contentFilter?: KnContentFilterPrefs },
): boolean {
	if (!browser) return false;
	const value = serializeKnPrefs(prefs);
	const oneYearSeconds = 60 * 60 * 24 * 365;
	const secure = location.protocol === 'https:' ? '; secure' : '';
	document.cookie = `${KN_PREFS_COOKIE}=${value}; path=/; max-age=${oneYearSeconds}; samesite=lax${secure}`;
	return readKnPrefsCookieRaw() === value;
}

function readKnPrefsCookieRaw(): string | null {
	if (!browser) return null;
	const match = document.cookie.split('; ').find((row) => row.startsWith(`${KN_PREFS_COOKIE}=`));
	return match ? match.slice(KN_PREFS_COOKIE.length + 1) : null;
}

/**
 * Read the kn_prefs cookie from the browser's document.cookie. Used by the
 * client-side migration on first mount to detect "localStorage exists but
 * cookie doesn't" and write the cookie. Returns null on the server.
 */
export function readKnPrefsCookieFromBrowser(): KnPrefs | null {
	if (!browser) return null;
	const match = document.cookie.split('; ').find((row) => row.startsWith(`${KN_PREFS_COOKIE}=`));
	if (!match) return null;
	const value = match.slice(KN_PREFS_COOKIE.length + 1);
	return parseKnPrefs(value);
}
