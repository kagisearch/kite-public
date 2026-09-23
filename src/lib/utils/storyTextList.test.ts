import {
	STORY_TEXT_LIST_FIELDS,
	normalizeStoryTextItem,
	normalizeStoryTextList,
	normalizeStoryTextListFields,
} from './storyTextList';
import { describe, expect, it } from 'vitest';

/**
 * The expected strings mirror `backend/domain/summarization/story_builder.py`
 * (`_parse_json_travel_advisory`, `_parse_json_technical_details`, ...), so an
 * item normalized on the client reads exactly as one flattened on the server.
 */
describe('normalizeStoryTextItem', () => {
	it('passes strings through untouched', () => {
		expect(normalizeStoryTextItem('Avoid the area until police reopen it')).toBe(
			'Avoid the area until police reopen it',
		);
	});

	it.each([
		[
			'travel_advisory',
			{
				category: 'Safety',
				information: 'Police urged the public to avoid the area',
				action: 'Avoid the area',
			},
			'Safety: Police urged the public to avoid the area. Avoid the area',
		],
		[
			'technical_details',
			{ name: 'Mass balance', description: 'Net gain or loss of glacier ice' },
			'Mass balance: Net gain or loss of glacier ice',
		],
		[
			'scientific_significance',
			{ aspect: 'Cryosphere response', description: 'One metre of vertical ice loss in 10 days' },
			'Cryosphere response: One metre of vertical ice loss in 10 days',
		],
		[
			'performance_statistics',
			{ name: 'Points', value: '42, up from 31 last season' },
			'Points: 42, up from 31 last season',
		],
		[
			'industry_impact',
			{ area: 'Semiconductors', description: 'Lead times extend into 2027' },
			'Semiconductors: Lead times extend into 2027',
		],
		[
			'user_action_items',
			{ task: 'Check your alerts', howto: 'Open the settings page and enable heat warnings' },
			'Check your alerts: Open the settings page and enable heat warnings',
		],
	])('flattens a %s object the way the backend does', (_field, item, expected) => {
		expect(normalizeStoryTextItem(item)).toBe(expected);
	});

	it('omits the action sentence when a travel advisory has none', () => {
		expect(
			normalizeStoryTextItem({ category: 'Visa', information: 'Transit visas are waived' }),
		).toBe('Visa: Transit visas are waived');
	});

	it('does not double the full stop before the action', () => {
		const item = {
			category: 'Safety',
			information: 'Roads are closed.',
			action: 'Use rail instead',
		};

		expect(normalizeStoryTextItem(item)).toBe('Safety: Roads are closed. Use rail instead');
	});

	it('keeps a single field when its pair is missing', () => {
		expect(normalizeStoryTextItem({ description: 'Standalone note' })).toBe('Standalone note');
		expect(normalizeStoryTextItem({ name: 'Standalone name' })).toBe('Standalone name');
	});

	it('falls back to the readable values of an unrecognised shape', () => {
		expect(normalizeStoryTextItem({ foo: 'alpha', bar: 'beta' })).toBe('alpha: beta');
	});

	it('never yields [object Object]', () => {
		for (const item of [{}, { nested: { deep: 'x' } }, { a: null }, Object.create(null)]) {
			expect(normalizeStoryTextItem(item)).not.toContain('[object Object]');
		}
	});

	it.each([
		[null, ''],
		[undefined, ''],
		[42, '42'],
	])('handles the non-object value %p', (input, expected) => {
		expect(normalizeStoryTextItem(input)).toBe(expected);
	});
});

describe('normalizeStoryTextList', () => {
	it('normalizes a mixed list and drops empties', () => {
		const items = [
			'Already a string',
			{ category: 'Safety', information: 'Avoid the centre', action: 'Follow local advice' },
			{},
			null,
		];

		expect(normalizeStoryTextList(items)).toEqual([
			'Already a string',
			'Safety: Avoid the centre. Follow local advice',
		]);
	});

	it.each([
		['a non-array', { not: 'an array' }],
		['null', null],
		['undefined', undefined],
	])('returns an empty list for %s', (_label, input) => {
		expect(normalizeStoryTextList(input)).toEqual([]);
	});

	it('reproduces the reported Travel Advisory bug case', () => {
		// Three object items rendered as three "[object Object]" bullets.
		const items = [
			{
				category: 'Safety',
				information: 'Heat warnings remain active',
				action: 'Limit midday travel',
			},
			{
				category: 'Transport',
				information: 'Rail speed restrictions apply',
				action: 'Allow extra time',
			},
			{
				category: 'Health',
				information: 'Nighttime heat limits recovery',
				action: 'Check on older relatives',
			},
		];

		const result = normalizeStoryTextList(items);

		expect(result).toHaveLength(3);
		expect(result.every((item) => !item.includes('[object Object]'))).toBe(true);
		expect(result[0]).toBe('Safety: Heat warnings remain active. Limit midday travel');
	});
});

describe('normalizeStoryTextListFields', () => {
	it('normalizes every list field that can hold objects', () => {
		const story = {
			travel_advisory: [
				{ category: 'Safety', information: 'Avoid the centre', action: 'Follow advice' },
			],
			technical_details: [{ name: 'Term', description: 'Explained' }],
			user_action_items: [{ task: 'Check alerts', howto: 'Open settings' }],
		};

		const result = normalizeStoryTextListFields(story);

		expect(result.travel_advisory).toEqual(['Safety: Avoid the centre. Follow advice']);
		expect(result.technical_details).toEqual(['Term: Explained']);
		expect(result.user_action_items).toEqual(['Check alerts: Open settings']);
	});

	it('leaves string lists untouched, including their empty entries', () => {
		const talking = ['Already a string', 'Another'];
		const story = { talking_points: talking };

		const result = normalizeStoryTextListFields(story);

		expect(result.talking_points).toBe(talking);
	});

	it('ignores fields that are absent or not arrays', () => {
		const story = { travel_advisory: null, technical_details: undefined, industry_impact: 'nope' };

		expect(() => normalizeStoryTextListFields(story)).not.toThrow();
		expect(story.travel_advisory).toBeNull();
		expect(story.industry_impact).toBe('nope');
	});

	it('covers every field the story type exposes as a string list', () => {
		// Guard against a new list field being added without normalization.
		expect(STORY_TEXT_LIST_FIELDS).toContain('travel_advisory');
		expect(STORY_TEXT_LIST_FIELDS).toContain('scientific_significance');
		expect(STORY_TEXT_LIST_FIELDS).toContain('performance_statistics');
		expect(STORY_TEXT_LIST_FIELDS).toContain('industry_impact');
	});
});

describe('capitalization parity with the backend parsers', () => {
	it.each([
		// The backend upper-cases these leading labels...
		[{ name: 'mass balance', description: 'Net ice loss' }, 'Mass balance: Net ice loss'],
		[{ aspect: 'cryosphere', description: 'Ice loss' }, 'Cryosphere: Ice loss'],
		[{ area: 'rail', description: 'Delays' }, 'Rail: Delays'],
		[{ task: 'check alerts', howto: 'Open settings' }, 'Check alerts: Open settings'],
		// ...but leaves travel advisory categories and reaction entities alone.
		[{ category: 'seguridad', information: 'Evitar zonas' }, 'seguridad: Evitar zonas'],
		[{ entity: 'france', response: 'Condemned' }, 'france: Condemned'],
	])('flattens %o the way the backend would', (item, expected) => {
		expect(normalizeStoryTextItem(item)).toBe(expected);
	});

	it('rebuilds the international reactions form', () => {
		expect(normalizeStoryTextItem({ entity: 'France', response: 'Condemned the strike' })).toBe(
			'France: Condemned the strike',
		);
	});
});

describe('talking points', () => {
	it('flattens the backend heading/detail shape, capitalizing the heading', () => {
		expect(normalizeStoryTextItem({ heading: 'market reaction', detail: 'Shares fell 4%' })).toBe(
			'Market reaction: Shares fell 4%',
		);
	});
});
