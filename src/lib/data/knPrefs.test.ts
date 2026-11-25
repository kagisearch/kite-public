import { describe, expect, it } from 'vitest';
import communityFilters from './contentFilters.json';
import {
	compactContentFilterPrefs,
	getContentFilterPresetKeywords,
	type KnPrefs,
	parseKnPrefs,
	serializeKnPrefs,
} from './knPrefs';

describe('knPrefs', () => {
	it('parses legacy category and language prefs without display prefs', () => {
		const raw = encodeURIComponent(JSON.stringify({ enabled: ['world'], dataLang: 'it' }));

		expect(parseKnPrefs(raw)).toEqual({ enabled: ['world'], dataLang: 'it' });
	});

	it('round-trips structural display prefs', () => {
		const prefs: KnPrefs = {
			enabled: ['world', 'tech'],
			dataLang: 'it,en',
			display: {
				fontSize: 'small',
				storyCount: 3,
				layoutWidth: 'full',
				categoryHeaderPosition: 'top',
				introShown: true,
				singlePageMode: 'disabled',
			},
			contentFilter: {
				keywords: ['politics', 'celebrity'],
				filterMode: 'hide',
				filterScope: 'summary',
				showFilteredCount: false,
			},
		};

		expect(parseKnPrefs(serializeKnPrefs(prefs))).toEqual(prefs);
	});

	it('sanitizes malformed display prefs without rejecting the whole cookie', () => {
		const raw = encodeURIComponent(
			JSON.stringify({
				enabled: ['world'],
				dataLang: 'default',
				display: {
					fontSize: 'huge',
					storyCount: 99,
					layoutWidth: 'giant',
					categoryHeaderPosition: 'side',
					introShown: 'true',
					singlePageMode: 'everything',
				},
			}),
		);

		expect(parseKnPrefs(raw)).toEqual({
			enabled: ['world'],
			dataLang: 'default',
			display: {
				storyCount: 12,
			},
		});
	});

	it('sanitizes content filter prefs without rejecting the whole cookie', () => {
		const raw = encodeURIComponent(
			JSON.stringify({
				enabled: ['world'],
				dataLang: 'default',
				contentFilter: {
					keywords: [' Politics ', 42, 'politics', ''],
					filterMode: 'zoom',
					filterScope: 'everything',
					showFilteredCount: 'no',
				},
			}),
		);

		expect(parseKnPrefs(raw)).toEqual({
			enabled: ['world'],
			dataLang: 'default',
			contentFilter: {
				keywords: ['politics'],
				filterMode: 'hide',
				filterScope: 'all',
				showFilteredCount: true,
			},
		});
	});

	it('expands compact preset ids into keywords when parsing', () => {
		const raw = encodeURIComponent(
			JSON.stringify({
				enabled: ['world'],
				dataLang: 'en',
				contentFilter: {
					activePresets: ['politics'],
					customKeywords: ['custom-topic'],
					filterMode: 'blur',
					filterScope: 'title',
					showFilteredCount: false,
				},
			}),
		);

		const parsed = parseKnPrefs(raw);
		expect(parsed?.contentFilter?.keywords).toContain('trump');
		expect(parsed?.contentFilter?.keywords).toContain('custom-topic');
		expect(parsed?.contentFilter).toMatchObject({
			filterMode: 'blur',
			filterScope: 'title',
			showFilteredCount: false,
		});
	});

	it('compacts preset filters before cookie serialization', () => {
		const compact = compactContentFilterPrefs({
			keywords: ['trump', 'election', 'custom-topic'],
			activePresets: ['politics'],
			filterMode: 'hide',
			filterScope: 'all',
			showFilteredCount: true,
		});

		expect(compact).toEqual({
			activePresets: ['politics'],
			presetLanguage: 'default',
			customKeywords: ['custom-topic'],
			filterMode: 'hide',
			filterScope: 'all',
			showFilteredCount: true,
		});
	});

	it('preserves explicit compact custom keywords with active presets', () => {
		const compact = compactContentFilterPrefs({
			activePresets: ['politics'],
			customKeywords: [' Custom-Topic ', 'trump'],
			filterMode: 'hide',
			filterScope: 'all',
			showFilteredCount: true,
		});

		expect(compact).toEqual({
			activePresets: ['politics'],
			presetLanguage: 'default',
			customKeywords: ['custom-topic', 'trump'],
			filterMode: 'hide',
			filterScope: 'all',
			showFilteredCount: true,
		});
	});

	it('uses custom preset expansion for existing custom-mode cookies', () => {
		const raw = encodeURIComponent(
			JSON.stringify({
				enabled: ['world'],
				dataLang: 'en,es,it,fr',
				contentFilter: {
					activePresets: ['violence'],
					customKeywords: ['pope'],
					filterMode: 'blur',
					filterScope: 'all',
					showFilteredCount: true,
				},
			}),
		);

		const parsed = parseKnPrefs(raw);
		expect(parsed?.contentFilter?.keywords).toContain('shooting');
		expect(parsed?.contentFilter?.keywords).toContain('pope');
		expect(parsed?.contentFilter?.keywords).not.toContain('tiroteo');
		expect(parsed?.contentFilter?.keywords).not.toContain('sparatoria');
	});

	it('uses presetLanguage instead of API dataLang when provided', () => {
		const raw = encodeURIComponent(
			JSON.stringify({
				enabled: ['world'],
				dataLang: 'en,es,it,fr',
				contentFilter: {
					activePresets: ['violence'],
					presetLanguage: 'es',
					filterMode: 'blur',
					filterScope: 'all',
					showFilteredCount: true,
				},
			}),
		);

		const parsed = parseKnPrefs(raw);
		expect(parsed?.contentFilter?.keywords).toContain('tiroteo');
		expect(parsed?.contentFilter?.keywords).not.toContain('sparatoria');
	});

	it('caps compact custom keyword storage to the parsed keyword limit', () => {
		const keywords = Array.from({ length: 250 }, (_, index) => `topic-${index}`);
		const compact = compactContentFilterPrefs({
			keywords,
			filterMode: 'hide',
			filterScope: 'all',
			showFilteredCount: true,
		});

		expect(compact?.keywords).toHaveLength(200);
		expect(compact?.keywords?.at(-1)).toBe('topic-199');
	});

	it('treats source-language presets like all-language presets', () => {
		const politics = communityFilters.filters.find((preset) => preset.id === 'politics');
		expect(politics).toBeTruthy();

		const sourceKeywords = getContentFilterPresetKeywords(politics!, 'source');
		const englishKeywords = getContentFilterPresetKeywords(politics!, 'en');

		expect(sourceKeywords).toContain('wahl');
		expect(englishKeywords).not.toContain('wahl');
	});
});
