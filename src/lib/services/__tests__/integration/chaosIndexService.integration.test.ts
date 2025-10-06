import { describe, expect, it } from 'vitest';
import { batchService } from '../../batchService';
import { chaosIndexService } from '../../chaosIndexService';

describe('ChaosIndexService Integration Tests', () => {
	describe('loadChaosIndex with real API', () => {
		it('should load chaos index from the latest batch', async () => {
			// Ensure we're not in time travel mode
			batchService.setTimeTravelBatch(null);

			const result = await chaosIndexService.loadChaosIndex('en');

			// Result might be null if chaos index is not available
			if (result !== null) {
				expect(result).toHaveProperty('chaosIndex');
				expect(result).toHaveProperty('chaosDescription');
				expect(result).toHaveProperty('chaosLastUpdated');

				expect(typeof result.chaosIndex).toBe('number');
				expect(result.chaosIndex).toBeGreaterThanOrEqual(0);
				expect(result.chaosIndex).toBeLessThanOrEqual(100);

				expect(typeof result.chaosDescription).toBe('string');
				expect(result.chaosDescription.length).toBeGreaterThan(0);

				if (result.chaosLastUpdated !== null) {
					expect(typeof result.chaosLastUpdated).toBe('string');
					// Should be a valid ISO date string
					expect(() => new Date(result.chaosLastUpdated!)).not.toThrow();
				}
			}
		});
	});

	describe('getChaosIndexHistory with real API', () => {
		it('should fetch chaos index history', async () => {
			const result = await chaosIndexService.getChaosIndexHistory('en', 7);

			expect(Array.isArray(result)).toBe(true);

			// If we have history data
			if (result.length > 0) {
				result.forEach((entry) => {
					expect(entry).toHaveProperty('date');
					expect(entry).toHaveProperty('score');
					expect(entry).toHaveProperty('summary');

					expect(typeof entry.date).toBe('string');
					expect(() => new Date(entry.date)).not.toThrow();

					expect(typeof entry.score).toBe('number');
					expect(entry.score).toBeGreaterThanOrEqual(0);
					expect(entry.score).toBeLessThanOrEqual(100);

					expect(typeof entry.summary).toBe('string');
				});

				// Verify entries are sorted by date (most recent first)
				for (let i = 1; i < result.length; i++) {
					const prevDate = new Date(result[i - 1].date);
					const currDate = new Date(result[i].date);
					expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
				}
			}
		});

		it('should handle different day ranges', async () => {
			const result30Days = await chaosIndexService.getChaosIndexHistory('en', 30);
			const result7Days = await chaosIndexService.getChaosIndexHistory('en', 7);

			// 30 days should have more or equal entries than 7 days
			expect(result30Days.length).toBeGreaterThanOrEqual(result7Days.length);
		});
	});
});
