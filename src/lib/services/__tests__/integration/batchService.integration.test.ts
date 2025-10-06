import { beforeEach, describe, expect, it } from 'vitest';
import { batchService } from '../../batchService';

describe('BatchService Integration Tests', () => {
	beforeEach(() => {
		// Reset to live mode before each test
		batchService.setTimeTravelBatch(null);
	});

	describe('loadInitialData with real API', () => {
		it('should load latest batch data from the API', async () => {
			const result = await batchService.loadInitialData('en');

			// Verify the structure of the response
			expect(result).toHaveProperty('batchId');
			expect(result).toHaveProperty('categories');
			expect(result).toHaveProperty('categoryMap');
			expect(result).toHaveProperty('timestamp');
			expect(result).toHaveProperty('hasOnThisDay');

			// Verify data types
			expect(typeof result.batchId).toBe('string');
			expect(Array.isArray(result.categories)).toBe(true);
			expect(typeof result.categoryMap).toBe('object');
			expect(typeof result.timestamp).toBe('number');
			expect(typeof result.hasOnThisDay).toBe('boolean');

			// Verify categories have the expected structure
			if (result.categories.length > 0) {
				const firstCategory = result.categories[0];
				expect(firstCategory).toHaveProperty('id');
				expect(firstCategory).toHaveProperty('name');
				expect(typeof firstCategory.id).toBe('string');
				expect(typeof firstCategory.name).toBe('string');
			}

			// Verify categoryMap entries
			const categoryIds = Object.keys(result.categoryMap);
			expect(categoryIds.length).toBeGreaterThan(0);
			categoryIds.forEach((categoryId) => {
				expect(typeof result.categoryMap[categoryId]).toBe('string');
				// UUID should match pattern
				expect(result.categoryMap[categoryId]).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
				);
			});

			// If chaos index is present, verify its structure
			if (result.chaosIndex !== undefined) {
				expect(typeof result.chaosIndex).toBe('number');
				expect(result.chaosIndex).toBeGreaterThanOrEqual(0);
				expect(result.chaosIndex).toBeLessThanOrEqual(100);
				expect(typeof result.chaosDescription).toBe('string');
				expect(typeof result.chaosLastUpdated).toBe('string');
			}
		});

		it('should handle different languages', async () => {
			// Test with different language codes
			const languages = ['en', 'es', 'fr'];

			for (const lang of languages) {
				const result = await batchService.loadInitialData(lang);
				expect(result.batchId).toBeTruthy();
				expect(result.categories.length).toBeGreaterThan(0);
			}
		});

		it('should properly track time travel mode', () => {
			expect(batchService.isTimeTravelMode()).toBe(false);
			expect(batchService.getCurrentBatchId()).toBe(null);

			const testBatchId = 'test-batch-123';
			batchService.setTimeTravelBatch(testBatchId);

			expect(batchService.isTimeTravelMode()).toBe(true);
			expect(batchService.getCurrentBatchId()).toBe(testBatchId);

			batchService.setTimeTravelBatch(null);
			expect(batchService.isTimeTravelMode()).toBe(false);
		});
	});
});
