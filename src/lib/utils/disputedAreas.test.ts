import { disputedAreas, findDisputedArea } from './disputedAreas';
import { describe, expect, it } from 'vitest';

// Crimea lit up all of Russia before this (KNEWS-451).
describe('findDisputedArea', () => {
	const contested: [string, number, number, string][] = [
		['Simferopol, Crimea', 44.95, 34.1, 'Crimea'],
		['Sevastopol, Crimea', 44.6, 33.52, 'Crimea'],
		['Srinagar, Kashmir', 34.08, 74.8, 'Jammu and Kashmir'],
		['Golan Heights', 33.0, 35.75, 'Golan Heights'],
		['Western Sahara', 24.2, -13.2, 'W. Sahara'],
		['Nicosia, N. Cyprus', 35.19, 33.36, 'N. Cyprus'],
	];

	it.each(contested)('flags %s', (_label, lat, lng, expected) => {
		expect(findDisputedArea(lat, lng)?.name).toBe(expected);
	});

	const undisputed: [string, number, number][] = [
		['Lviv, Ukraine', 49.84, 24.03],
		['Kyiv, Ukraine', 50.45, 30.52],
		['Moscow, Russia', 55.75, 37.62],
		['Paris, France', 48.86, 2.35],
		['New York, USA', 40.71, -74.01],
		['mid-Atlantic ocean', 30.0, -40.0],
	];

	it.each(undisputed)('leaves %s to the normal country highlight', (_label, lat, lng) => {
		expect(findDisputedArea(lat, lng)).toBeNull();
	});

	it('ships a usable dataset', () => {
		expect(disputedAreas.length).toBeGreaterThan(20);
		for (const area of disputedAreas) {
			expect(area.name).toBeTruthy();
			expect(area.polygons.length).toBeGreaterThan(0);
			for (const polygon of area.polygons) {
				expect(polygon[0].length).toBeGreaterThanOrEqual(4);
			}
		}
	});

	it('names the territory rather than a claimant', () => {
		// Built from BRK_NAME; NAME carries the claimant ("Morocco", "India").
		const names = disputedAreas.map((a) => a.name);
		expect(names).not.toContain('Morocco');
		expect(names).not.toContain('India');
		expect(names).toContain('W. Sahara');
		expect(names).toContain('Jammu and Kashmir');
	});
});
