import {
	normalizeInternationalReaction,
	normalizeInternationalReactions,
} from './internationalReactions';
import { describe, expect, it } from 'vitest';

describe('normalizeInternationalReaction', () => {
	it('passes through canonical string items unchanged', () => {
		const input = '🇬🇧 United Kingdom: Britain said it planned restrictions.';
		expect(normalizeInternationalReaction(input)).toBe(input);
	});

	it('normalizes the leaked {country_flag, text} object shape (KNEWS-434)', () => {
		// This exact shape (from prod) crashed the story render with
		// "endsWith is not a function" and froze the site.
		const input = {
			country_flag: '🇨🇳',
			text: 'Chinese cybersecurity firms mobilized around autonomous AI agents.',
		};
		expect(normalizeInternationalReaction(input)).toBe(
			'🇨🇳: Chinese cybersecurity firms mobilized around autonomous AI agents.',
		);
	});

	it('normalizes the backend model {entity, flag, response} object shape', () => {
		const input = {
			entity: 'United Kingdom',
			flag: '🇬🇧',
			response: 'Britain said it planned restrictions.',
		};
		expect(normalizeInternationalReaction(input)).toBe(
			'🇬🇧 United Kingdom: Britain said it planned restrictions.',
		);
	});

	it('handles objects with an entity but no flag', () => {
		const input = { entity: 'European Union', response: 'The bloc opened an inquiry.' };
		expect(normalizeInternationalReaction(input)).toBe(
			'European Union: The bloc opened an inquiry.',
		);
	});

	it('returns the text alone when only text is present', () => {
		expect(normalizeInternationalReaction({ text: 'A statement was issued.' })).toBe(
			'A statement was issued.',
		);
	});

	it('returns empty string for unusable input', () => {
		expect(normalizeInternationalReaction(null)).toBe('');
		expect(normalizeInternationalReaction(undefined)).toBe('');
		expect(normalizeInternationalReaction({})).toBe('');
	});
});

describe('normalizeInternationalReactions', () => {
	it('normalizes a mixed array of strings and objects and drops empties', () => {
		const result = normalizeInternationalReactions([
			'🇫🇷 France: Paris responded.',
			{ country_flag: '🇨🇳', text: 'Beijing responded.' },
			{},
			null,
		]);
		expect(result).toEqual(['🇫🇷 France: Paris responded.', '🇨🇳: Beijing responded.']);
	});

	it('returns an empty array for non-array input', () => {
		expect(normalizeInternationalReactions(null)).toEqual([]);
		expect(normalizeInternationalReactions(undefined)).toEqual([]);
	});
});
