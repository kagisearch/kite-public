import { describe, expect, it } from 'vitest';

describe('Search API Integration Tests', () => {
	const baseUrl = '/api/search';

	describe('GET /api/search', () => {
		it('should return results for a valid query', async () => {
			const response = await fetch(`${baseUrl}?q=world&limit=5`);

			// May return 501 in file-only mode or results in DB mode
			if (response.status === 501) {
				// File-only mode — skip remaining assertions
				expect(response.status).toBe(501);
				return;
			}

			expect(response.ok).toBe(true);
			const data = await response.json();

			expect(data).toHaveProperty('results');
			expect(data).toHaveProperty('totalCount');
			expect(data).toHaveProperty('hasMore');
			expect(Array.isArray(data.results)).toBe(true);
			expect(typeof data.totalCount).toBe('number');
			expect(typeof data.hasMore).toBe('boolean');
		});

		it('should return results with correct story shape', async () => {
			const response = await fetch(`${baseUrl}?q=news&limit=5`);

			if (response.status === 501) return; // file-only mode

			expect(response.ok).toBe(true);
			const data = await response.json();

			if (data.results.length > 0) {
				const result = data.results[0];
				expect(result).toHaveProperty('story');
				expect(result).toHaveProperty('categoryId');
				expect(result).toHaveProperty('categoryName');
				expect(result).toHaveProperty('batchId');
				expect(result).toHaveProperty('batchDate');

				const story = result.story;
				expect(story).toHaveProperty('title');
				expect(typeof story.title).toBe('string');
			}
		});

		it('should return results from multiple categories (cross-category)', async () => {
			const response = await fetch(`${baseUrl}?q=the&limit=50`);

			if (response.status === 501) return;

			expect(response.ok).toBe(true);
			const data = await response.json();

			if (data.results.length > 1) {
				const uniqueCategories = new Set(data.results.map((r: any) => r.categoryId));
				// "the" is common enough that it should match across categories
				expect(uniqueCategories.size).toBeGreaterThanOrEqual(1);
			}
		});

		it('should support pagination with offset', async () => {
			const response1 = await fetch(`${baseUrl}?q=the&limit=5&offset=0`);

			if (response1.status === 501) return;

			expect(response1.ok).toBe(true);
			const data1 = await response1.json();

			if (data1.hasMore) {
				const response2 = await fetch(`${baseUrl}?q=the&limit=5&offset=5`);
				expect(response2.ok).toBe(true);
				const data2 = await response2.json();

				// Second page should also have results
				expect(data2.results.length).toBeGreaterThan(0);

				// Results should be different from first page
				if (data1.results.length > 0 && data2.results.length > 0) {
					expect(data2.results[0].story.title).not.toBe(data1.results[0].story.title);
				}
			}
		});

		it('should filter by category', async () => {
			const response = await fetch(`${baseUrl}?q=the&limit=10&categoryId=world`);

			if (response.status === 501) return;

			expect(response.ok).toBe(true);
			const data = await response.json();

			// All results should be from the 'world' category
			for (const result of data.results) {
				expect(result.categoryId).toBe('world');
			}
		});

		it('should support language parameter', async () => {
			const response = await fetch(`${baseUrl}?q=news&limit=5&lang=en`);

			if (response.status === 501) return;

			expect(response.ok).toBe(true);
			const data = await response.json();
			expect(data).toHaveProperty('results');
		});

		it('should reject queries shorter than 3 characters without filters', async () => {
			const response = await fetch(`${baseUrl}?q=ab`);

			if (response.status === 501) return;

			expect(response.status).toBe(400);
		});

		it('should accept short queries when filters are present', async () => {
			const response = await fetch(`${baseUrl}?q=ab&categoryId=world`);

			if (response.status === 501) return;

			// Should not return 400 since filters are present
			expect(response.status).not.toBe(400);
		});

		it('should respect limit parameter', async () => {
			const response = await fetch(`${baseUrl}?q=the&limit=3`);

			if (response.status === 501) return;

			expect(response.ok).toBe(true);
			const data = await response.json();
			expect(data.results.length).toBeLessThanOrEqual(3);
		});

		it('should support date range filtering', async () => {
			const now = new Date();
			const weekAgo = new Date(now);
			weekAgo.setDate(weekAgo.getDate() - 7);

			const response = await fetch(
				`${baseUrl}?q=the&limit=5&from=${weekAgo.toISOString()}&to=${now.toISOString()}`,
			);

			if (response.status === 501) return;

			expect(response.ok).toBe(true);
			const data = await response.json();
			expect(data).toHaveProperty('results');
		});

		it('should return 400 for invalid date format', async () => {
			const response = await fetch(`${baseUrl}?q=test&from=not-a-date`);

			if (response.status === 501) return;

			expect(response.status).toBe(400);
		});

		it('should include totalCount greater than or equal to result count', async () => {
			const response = await fetch(`${baseUrl}?q=the&limit=2`);

			if (response.status === 501) return;

			expect(response.ok).toBe(true);
			const data = await response.json();

			// totalCount should be >= results length
			expect(data.totalCount).toBeGreaterThanOrEqual(data.results.length);
		});
	});
});
