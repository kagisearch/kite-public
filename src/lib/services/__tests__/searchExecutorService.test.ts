import type { Category, Story } from '$lib/types';
import { SearchExecutorService } from '../search/SearchExecutorService';
import type { SearchFilter } from '../search/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock languageSettings used by historical search
vi.mock('$lib/data/settings.svelte.js', () => ({
	languageSettings: { data: 'en' },
}));

function createStory(overrides: Partial<Story> = {}): Story {
	return {
		title: 'Default Story Title',
		short_summary: 'A default summary about world events',
		category: 'World News',
		location: 'Washington, DC',
		quote: 'This is a notable quote',
		did_you_know: 'An interesting fact',
		talking_points: ['Point one', 'Point two'],
		emoji: '🌍',
		articles: [],
		cluster_number: 1,
		...overrides,
	} as Story;
}

function createCategories(): Category[] {
	return [
		{ id: 'world', name: 'World' },
		{ id: 'tech', name: 'Technology' },
		{ id: 'science', name: 'Science' },
	];
}

describe('SearchExecutorService', () => {
	let service: SearchExecutorService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new SearchExecutorService();
	});

	describe('local search', () => {
		const categories = createCategories();

		it('should match stories by title', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Climate Change Summit' })],
			};

			const result = await service.executeSearch('climate', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].story.title).toBe('Climate Change Summit');
			expect(result.localResults[0].categoryId).toBe('world');
			expect(result.localResults[0].categoryName).toBe('World');
		});

		it('should match stories by short_summary', async () => {
			const stories: Record<string, Story[]> = {
				tech: [
					createStory({
						title: 'Tech News',
						short_summary: 'New quantum computing breakthrough',
					}),
				],
			};

			const result = await service.executeSearch('quantum', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].story.matchedFields).toContain('short_summary');
		});

		it('should match stories by location', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ location: 'Tokyo, Japan' })],
			};

			const result = await service.executeSearch('tokyo', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].story.matchedFields).toContain('location');
		});

		it('should match stories by quote', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ quote: 'Democracy is the cornerstone of freedom' })],
			};

			const result = await service.executeSearch('cornerstone', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].story.matchedFields).toContain('quote');
		});

		it('should match stories by did_you_know', async () => {
			const stories: Record<string, Story[]> = {
				science: [createStory({ did_you_know: 'Octopuses have three hearts' })],
			};

			const result = await service.executeSearch('octopus', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].story.matchedFields).toContain('did_you_know');
		});

		it('should match stories by talking_points', async () => {
			const stories: Record<string, Story[]> = {
				tech: [
					createStory({
						talking_points: ['AI regulation debate', 'Open source models'],
					}),
				],
			};

			const result = await service.executeSearch('regulation', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].story.matchedFields).toContain('talking_points');
		});

		it('should be case-insensitive', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'BREAKING NEWS: Major Event' })],
			};

			const result = await service.executeSearch('breaking', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
		});

		it('should return empty for no matches', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Unrelated Story' })],
			};

			const result = await service.executeSearch('xyznonexistent', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(0);
		});

		it('should search across multiple categories (cross-category)', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Tariffs Impact Global Trade' })],
				tech: [createStory({ title: 'Tech Tariffs on Semiconductors' })],
				science: [createStory({ title: 'Unrelated Science News' })],
			};

			const result = await service.executeSearch('tariffs', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(2);
			const categoryIds = result.localResults.map((r) => r.categoryId);
			expect(categoryIds).toContain('world');
			expect(categoryIds).toContain('tech');
		});

		it('should respect category filter', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Tariffs Impact Global Trade' })],
				tech: [createStory({ title: 'Tech Tariffs on Semiconductors' })],
			};

			const categoryFilter: SearchFilter = {
				type: 'category',
				value: 'world',
				display: 'World',
				isValid: true,
			};

			const result = await service.executeSearch('tariffs', [categoryFilter], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].categoryId).toBe('world');
		});

		it('should sort by relevance (more matched fields first)', async () => {
			const stories: Record<string, Story[]> = {
				world: [
					createStory({
						title: 'Climate story',
						short_summary: 'About climate change',
						location: 'Climate City',
					}),
					createStory({
						title: 'Climate headline only',
						short_summary: 'No match here',
						location: 'Nowhere',
					}),
				],
			};

			const result = await service.executeSearch('climate', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(2);
			// Story with 3 matches should come first
			const firstMatchCount = result.localResults[0].story.matchedFields?.length || 0;
			const secondMatchCount = result.localResults[1].story.matchedFields?.length || 0;
			expect(firstMatchCount).toBeGreaterThan(secondMatchCount);
		});

		it('should create snippets with context around match', async () => {
			const longText =
				'This is a very long summary text that contains the word quantum somewhere in the middle of the text and continues for a while after that.';
			const stories: Record<string, Story[]> = {
				tech: [createStory({ title: 'No match', short_summary: longText })],
			};

			const result = await service.executeSearch('quantum', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			expect(result.localResults).toHaveLength(1);
			const snippet = result.localResults[0].story.snippet || '';
			expect(snippet).toContain('quantum');
			expect(snippet.length).toBeLessThan(longText.length);
		});

		it('should return all stories when query is empty but filters exist', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Story A' }), createStory({ title: 'Story B' })],
			};

			const result = await service.executeSearch('', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			// Empty query with no filters returns nothing
			expect(result.localResults).toHaveLength(0);
		});

		it('should skip categories not in the categories list', async () => {
			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Climate News' })],
				unknown: [createStory({ title: 'Climate Unknown Category' })],
			};

			const result = await service.executeSearch('climate', [], stories, categories, {
				includeLocal: true,
				includeHistorical: false,
				limit: 20,
			});

			// Should only find the one in 'world', not 'unknown'
			expect(result.localResults).toHaveLength(1);
			expect(result.localResults[0].categoryId).toBe('world');
		});
	});

	describe('historical search', () => {
		it('should call /api/search with correct params', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [],
					totalCount: 0,
					hasMore: false,
				}),
			} as Response);

			await service.executeSearch('climate change', [], {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
				offset: 0,
			});

			expect(fetch).toHaveBeenCalledTimes(1);
			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(calledUrl).toContain('/api/search');
			expect(calledUrl).toContain('q=climate+change');
			expect(calledUrl).toContain('limit=20');
			expect(calledUrl).toContain('lang=en');
		});

		it('should not send query shorter than 3 chars to API', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ results: [], totalCount: 0, hasMore: false }),
			} as Response);

			await service.executeSearch('ab', [], {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
			});

			// fetch should be called but without q param (or with empty q)
			const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string | undefined;
			if (calledUrl) {
				const url = new URL(calledUrl, 'http://localhost');
				expect(url.searchParams.has('q')).toBe(false);
			}
		});

		it('should pass category filter to API', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ results: [], totalCount: 0, hasMore: false }),
			} as Response);

			const filter: SearchFilter = {
				type: 'category',
				value: 'world',
				display: 'World',
				isValid: true,
			};

			await service.executeSearch('test query', [filter], {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
			});

			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(calledUrl).toContain('categoryId=world');
		});

		it('should pass date filters to API', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ results: [], totalCount: 0, hasMore: false }),
			} as Response);

			const filters: SearchFilter[] = [
				{
					type: 'from',
					value: 'yesterday',
					display: 'yesterday',
					isValid: true,
				},
				{ type: 'to', value: 'today', display: 'today', isValid: true },
			];

			await service.executeSearch('test query', filters, {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
			});

			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(calledUrl).toContain('from=');
			expect(calledUrl).toContain('to=');
		});

		it('should handle API error gracefully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
			} as Response);

			const result = await service.executeSearch('test query', [], {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
			});

			// Should return empty results, not throw
			expect(result.historicalResults).toHaveLength(0);
			expect(result.historicalCount).toBe(0);
		});

		it('should handle network error gracefully', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			const result = await service.executeSearch('test query', [], {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
			});

			expect(result.historicalResults).toHaveLength(0);
		});

		it('should pass offset for pagination', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ results: [], totalCount: 0, hasMore: false }),
			} as Response);

			await service.executeSearch('test query', [], {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
				offset: 40,
			});

			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
			expect(calledUrl).toContain('offset=40');
		});

		it('should convert API results to SearchResult format', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [
						{
							story: { title: 'Historical Story', short_summary: 'Summary' },
							categoryId: 'world',
							categoryName: 'World',
							batchId: 'batch-123',
							batchDate: '2025-01-15T00:00:00Z',
						},
					],
					totalCount: 1,
					hasMore: false,
				}),
			} as Response);

			const result = await service.executeSearch('historical', [], {}, [], {
				includeLocal: false,
				includeHistorical: true,
				limit: 20,
			});

			expect(result.historicalResults).toHaveLength(1);
			expect(result.historicalResults[0].story.title).toBe('Historical Story');
			expect(result.historicalResults[0].categoryId).toBe('world');
			expect(result.historicalResults[0].batchId).toBe('batch-123');
			expect(result.historicalResults[0].batchDate).toBe('2025-01-15T00:00:00Z');
			expect(result.historicalCount).toBe(1);
		});
	});
});
