import { displaySettings, settings } from './settings.svelte';
import { describe, expect, it } from 'vitest';

describe('Setting persistence', () => {
	describe('save', () => {
		it('stores numbers as bare digit strings', () => {
			settings.storyCount.currentValue = 3;
			settings.storyCount.save();

			expect(localStorage.getItem('storyCount')).toBe('3');
		});

		it('stores booleans as bare literals', () => {
			settings.useLatestUrls.currentValue = true;
			settings.useLatestUrls.save();

			expect(localStorage.getItem('useLatestUrls')).toBe('true');
		});

		it('stores arrays as JSON', () => {
			settings.enabledCategories.currentValue = ['world', 'tech'];
			settings.enabledCategories.save();

			expect(localStorage.getItem('enabledCategories')).toBe('["world","tech"]');
		});

		it('stores strings raw, not JSON-quoted', () => {
			settings.theme.currentValue = 'dark';
			settings.theme.save();

			expect(localStorage.getItem('theme')).toBe('dark');
		});
	});

	describe('load', () => {
		it('loads numbers as numbers', () => {
			localStorage.setItem('storyCount', '3');

			settings.storyCount.load();

			expect(settings.storyCount.currentValue).toBe(3);
		});

		it('falls back to the default for non-numeric garbage', () => {
			localStorage.setItem('storyCount', 'not-a-number');

			settings.storyCount.load();

			expect(settings.storyCount.currentValue).toBe(12);
		});

		it.each([
			['0', 3],
			['-1', 3],
			['99', 12],
			['5.5', 6],
		])('clamps a stored storyCount of %s to %i stories', (stored, expected) => {
			localStorage.setItem('storyCount', stored);

			settings.storyCount.load();

			expect(displaySettings.storyCount).toBe(expected);
		});

		it('keeps numeric-looking strings as strings', () => {
			localStorage.setItem('theme', '3');

			settings.theme.load();

			expect(settings.theme.currentValue).toBe('3');
		});

		it('loads booleans as booleans', () => {
			localStorage.setItem('useLatestUrls', 'true');

			settings.useLatestUrls.load();

			expect(settings.useLatestUrls.currentValue).toBe(true);
		});

		it('loads arrays as arrays', () => {
			localStorage.setItem('enabledCategories', '["world","tech"]');

			settings.enabledCategories.load();

			expect(settings.enabledCategories.currentValue).toEqual(['world', 'tech']);
		});
	});
});
