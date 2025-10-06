import { describe, expect, it } from 'vitest';
import { batchService } from '../../batchService';
import { onThisDayService } from '../../onThisDayService';

describe('OnThisDayService Integration Tests', () => {
	describe('loadOnThisDayEvents with real API', () => {
		it('should load OnThisDay events from the latest batch', async () => {
			// Ensure we're in live mode
			batchService.setTimeTravelBatch(null);

			const events = await onThisDayService.loadOnThisDayEvents('en');

			expect(Array.isArray(events)).toBe(true);

			// OnThisDay might not always have data
			if (events.length > 0) {
				events.forEach((event) => {
					expect(event).toHaveProperty('year');
					expect(event).toHaveProperty('content');
					expect(event).toHaveProperty('sort_year');
					expect(event).toHaveProperty('type');

					expect(typeof event.year).toBe('string');
					expect(typeof event.content).toBe('string');
					expect(typeof event.sort_year).toBe('number');
					expect(['event', 'person', 'people']).toContain(event.type);

					// Content should contain HTML with Wikipedia links
					if (event.content.includes('<a')) {
						expect(event.content).toMatch(/data-wiki-id="[^"]+"/);
					}
				});

				// Events should be sorted by sort_year
				for (let i = 1; i < events.length; i++) {
					expect(events[i].sort_year).toBeGreaterThanOrEqual(events[i - 1].sort_year);
				}
			}
		});

		it('should separate events and people correctly', async () => {
			const allEvents = await onThisDayService.loadOnThisDayEvents('en');

			const events = allEvents.filter((e) => e.type === 'event');
			const people = allEvents.filter((e) => e.type === 'person' || e.type === 'people');

			// All items should be either events or people
			expect(events.length + people.length).toBe(allEvents.length);

			// Verify events are historical events
			events.forEach((event) => {
				expect(event.type).toBe('event');
				// Events usually have years in the past
				expect(event.sort_year).toBeLessThan(new Date().getFullYear());
			});

			// Verify people entries
			people.forEach((person) => {
				expect(['person', 'people']).toContain(person.type);
				// People entries often include birth/death information
				expect(person.content.length).toBeGreaterThan(0);
			});
		});

		it('should handle empty OnThisDay data gracefully', async () => {
			// Even if there's no data, it should return an empty array
			const events = await onThisDayService.loadOnThisDayEvents('en');
			expect(Array.isArray(events)).toBe(true);
		});
	});
});
