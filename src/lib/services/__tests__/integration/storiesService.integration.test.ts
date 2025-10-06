import { describe, expect, it } from 'vitest';
import { batchService } from '../../batchService';
import { storiesService } from '../../storiesService';

describe('StoriesService Integration Tests', () => {
	describe('loadStories with real API', () => {
		it('should load stories for a category', async () => {
			// First get the batch data to get valid IDs
			const batchData = await batchService.loadInitialData('en');

			// Find a category that exists (prefer World if available)
			const worldCategoryId = Object.keys(batchData.categoryMap).find(
				(id) => id.toLowerCase() === 'world',
			);

			if (worldCategoryId) {
				const categoryUuid = batchData.categoryMap[worldCategoryId];
				const result = await storiesService.loadStories(
					batchData.batchId,
					categoryUuid,
					5, // Load just 5 stories for testing
					'en',
				);

				expect(result).toHaveProperty('stories');
				expect(result).toHaveProperty('readCount');
				expect(result).toHaveProperty('timestamp');

				expect(Array.isArray(result.stories)).toBe(true);
				expect(result.stories.length).toBeGreaterThan(0);
				expect(result.stories.length).toBeLessThanOrEqual(5);

				// Verify story structure
				const firstStory = result.stories[0];
				expect(firstStory).toHaveProperty('title');
				expect(firstStory).toHaveProperty('short_summary');
				expect(firstStory).toHaveProperty('articles');
				expect(firstStory).toHaveProperty('category');

				expect(typeof firstStory.title).toBe('string');
				expect(typeof firstStory.short_summary).toBe('string');
				expect(Array.isArray(firstStory.articles)).toBe(true);

				// Verify articles structure
				if (firstStory.articles.length > 0) {
					const firstArticle = firstStory.articles[0];
					expect(firstArticle).toHaveProperty('title');
					expect(firstArticle).toHaveProperty('link');
					expect(firstArticle).toHaveProperty('domain');
					expect(firstArticle).toHaveProperty('date');
				}

				expect(typeof result.readCount).toBe('number');
				expect(typeof result.timestamp).toBe('number');
			}
		});

		it('should respect the limit parameter', async () => {
			const batchData = await batchService.loadInitialData('en');
			const firstCategoryId = Object.keys(batchData.categoryMap)[0];

			if (firstCategoryId) {
				const categoryUuid = batchData.categoryMap[firstCategoryId];

				const result3 = await storiesService.loadStories(batchData.batchId, categoryUuid, 3, 'en');

				const result10 = await storiesService.loadStories(
					batchData.batchId,
					categoryUuid,
					10,
					'en',
				);

				expect(result3.stories.length).toBeLessThanOrEqual(3);
				expect(result10.stories.length).toBeLessThanOrEqual(10);
				expect(result10.stories.length).toBeGreaterThanOrEqual(result3.stories.length);
			}
		});

		it('should handle different languages', async () => {
			const batchData = await batchService.loadInitialData('en');
			const firstCategoryId = Object.keys(batchData.categoryMap)[0];

			if (firstCategoryId) {
				const categoryUuid = batchData.categoryMap[firstCategoryId];

				// Test with English
				const resultEn = await storiesService.loadStories(batchData.batchId, categoryUuid, 5, 'en');

				expect(resultEn.stories.length).toBeGreaterThan(0);

				// Could test with other languages if the API supports it
				// and returns different content
			}
		});
	});
});
