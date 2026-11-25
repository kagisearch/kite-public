import { describe, expect, it } from 'vitest';
import {
	compactContentFilter,
	getPresetLanguage,
	normalizeStrings,
} from './contentFilterCompact';

describe('compactContentFilter', () => {
	it('returns null on empty input', () => {
		expect(compactContentFilter(null)).toBeNull();
		expect(compactContentFilter({})).toBeNull();
		expect(compactContentFilter({ activePresets: [], keywords: [] })).toBeNull();
	});

	it('keeps explicit keywords when no preset is active', () => {
		const compact = compactContentFilter({
			keywords: ['Trump', 'trump', '  hot-topic  '],
			filterMode: 'blur',
			filterScope: 'title',
			showFilteredCount: false,
		});

		expect(compact).toEqual({
			keywords: ['trump', 'hot-topic'],
			filterMode: 'blur',
			filterScope: 'title',
			showFilteredCount: false,
		});
	});

	it('preserves explicit presetLanguage when provided', () => {
		const compact = compactContentFilter(
			{
				activePresets: ['violence'],
				presetLanguage: 'es',
				customKeywords: ['pope'],
			},
			{ presetLanguage: 'default' },
		);

		expect(compact?.presetLanguage).toBe('es');
		expect(compact?.activePresets).toEqual(['violence']);
		expect(compact?.customKeywords).toEqual(['pope']);
	});

	it('coerces comma-separated fallback dataLang to "custom" when presetLanguage is missing', () => {
		const compact = compactContentFilter(
			{ activePresets: ['violence'], customKeywords: ['pope'] },
			{ presetLanguage: 'en,es,it' },
		);

		expect(compact?.presetLanguage).toBe('custom');
	});

	it('uses single-language fallback dataLang when presetLanguage is missing', () => {
		const compact = compactContentFilter(
			{ activePresets: ['violence'], customKeywords: ['pope'] },
			{ presetLanguage: 'es' },
		);

		expect(compact?.presetLanguage).toBe('es');
	});

	it('derives customKeywords from keywords \\ presetKeywords when presetKeywords are supplied', () => {
		const compact = compactContentFilter(
			{
				activePresets: ['violence'],
				keywords: ['shooting', 'tiroteo', 'pope'],
			},
			{ presetLanguage: 'default', presetKeywords: new Set(['shooting', 'tiroteo']) },
		);

		expect(compact?.customKeywords).toEqual(['pope']);
	});

	it('omits customKeywords derivation when presetKeywords are not supplied (inline path)', () => {
		const compact = compactContentFilter(
			{
				activePresets: ['violence'],
				keywords: ['shooting', 'tiroteo', 'pope'],
			},
			{ presetLanguage: 'default' },
		);

		// Inline path can't run derivation without the preset JSON; client
		// rewrites the cookie on the next saveSettings() with the canonical shape.
		expect(compact?.customKeywords).toBeUndefined();
		expect(compact?.activePresets).toEqual(['violence']);
		expect(compact?.presetLanguage).toBe('default');
	});

	it('caps keywords and customKeywords at 200 entries', () => {
		const longKeywords = Array.from({ length: 250 }, (_, i) => `kw-${i}`);
		const compact = compactContentFilter({ keywords: longKeywords });
		expect(compact?.keywords).toHaveLength(200);
	});

	it('rejects unknown filterMode and filterScope', () => {
		const compact = compactContentFilter({
			keywords: ['x'],
			filterMode: 'destroy',
			filterScope: 'everywhere',
		});
		expect(compact?.filterMode).toBe('hide');
		expect(compact?.filterScope).toBe('all');
	});
});

describe('normalizeStrings', () => {
	it('lowercases, trims, dedups, drops non-strings, and applies an optional limit', () => {
		expect(normalizeStrings(['  A  ', 'a', 'B', 'b', 42 as unknown as string])).toEqual(['a', 'b']);
		expect(normalizeStrings(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
	});

	it('returns an empty array for non-arrays', () => {
		expect(normalizeStrings(undefined)).toEqual([]);
		expect(normalizeStrings('a')).toEqual([]);
		expect(normalizeStrings({ 0: 'a', length: 1 } as unknown)).toEqual([]);
	});
});

describe('getPresetLanguage', () => {
	it('returns the value when it is already a string', () => {
		expect(getPresetLanguage('custom', 'en')).toBe('custom');
		expect(getPresetLanguage('default', 'en,fr')).toBe('default');
	});

	it('coerces comma-separated dataLang to "custom"', () => {
		expect(getPresetLanguage(undefined, 'en,fr')).toBe('custom');
	});

	it('falls back to "default" when both inputs are unusable', () => {
		expect(getPresetLanguage(undefined, '')).toBe('default');
		expect(getPresetLanguage(undefined, undefined as unknown as string)).toBe('default');
	});
});
