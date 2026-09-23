import type { Category, Story } from '$lib/types';
import { SearchService } from '../search/SearchService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock languageSettings used by SearchExecutorService
vi.mock('$lib/data/settings.svelte.js', () => ({
	languageSettings: { data: 'en' },
}));

function createStory(overrides: Partial<Story> = {}): Story {
	return {
		title: 'Default Story',
		short_summary: 'Default summary',
		category: 'General',
		articles: [],
		cluster_number: 1,
		...overrides,
	} as Story;
}

const categories: Category[] = [
	{ id: 'world', name: 'World' },
	{ id: 'tech', name: 'Technology' },
];

describe('SearchService', () => {
	let service: SearchService;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		service = new SearchService(categories);
	});

	afterEach(() => {
		vi.useRealTimers();
		service.destroy();
	});

	describe('initial state', () => {
		it('should have empty initial state', () => {
			const state = service.getState();
			expect(state.query).toBe('');
			expect(state.filters).toEqual([]);
			expect(state.results).toEqual([]);
			expect(state.isLoading).toBe(false);
			expect(state.hasMore).toBe(false);
			expect(state.selectedIndex).toBe(0);
			expect(state.totalCount).toBe(0);
		});
	});

	describe('updateFromInput', () => {
		it('should update the query', () => {
			service.updateFromInput('test query', 10);
			expect(service.state.query).toBe('test query');
		});

		it('should return filter suggestions when typing a filter keyword', () => {
			const result = service.updateFromInput('cat', 3);
			expect(result.suggestions.length).toBeGreaterThan(0);
			expect(result.suggestions.some((s) => s.value === 'category:')).toBe(true);
		});

		it('should return category suggestions when typing category:', () => {
			const result = service.updateFromInput('category:wor', 13);
			expect(result.context).not.toBeNull();
			expect(result.context?.type).toBe('category');
			expect(result.suggestions.length).toBeGreaterThan(0);
		});

		it('should return no suggestions for plain text', () => {
			const result = service.updateFromInput('climate change', 14);
			// "change" doesn't match any filter type prefix
			expect(result.suggestions).toHaveLength(0);
		});
	});

	describe('clear', () => {
		it('should reset all state', () => {
			// Set some state
			service.state.query = 'test';
			service.state.results = [
				{
					story: createStory() as any,
					categoryId: 'world',
					categoryName: 'World',
				},
			];
			service.state.isLoading = true;
			service.state.hasMore = true;

			service.clear();

			const state = service.getState();
			expect(state.query).toBe('');
			expect(state.results).toEqual([]);
			expect(state.isLoading).toBe(false);
			expect(state.hasMore).toBe(false);
			expect(state.selectedIndex).toBe(0);
		});
	});

	describe('executeSearch', () => {
		it('should return empty results for empty query and no filters', async () => {
			const result = await service.executeSearch({}, categories);
			expect(result).toEqual([]);
		});

		it('should call onLocalComplete with local results', async () => {
			service.updateFromInput('climate', 7);

			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Climate Change Summit' })],
			};

			const onLocalComplete = vi.fn();

			// Mock fetch for historical search (will be called after debounce)
			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: async () => ({ results: [], totalCount: 0, hasMore: false }),
			} as Response);

			const promise = service.executeSearch(stories, categories, undefined, onLocalComplete);

			// Advance past debounce timer for historical search
			await vi.advanceTimersByTimeAsync(350);
			await promise;

			expect(onLocalComplete).toHaveBeenCalledTimes(1);
			const [results, count] = onLocalComplete.mock.calls[0];
			expect(count).toBe(1);
			expect(results[0].story.title).toBe('Climate Change Summit');
		});

		it('should not search when query is empty and no valid filters', async () => {
			service.updateFromInput('', 0);

			const result = await service.executeSearch({}, categories);

			expect(result).toEqual([]);
			expect(service.state.results).toEqual([]);
		});

		it('should cancel previous search when starting a new one', async () => {
			service.updateFromInput('first', 5);

			// Mock fetch
			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: async () => ({ results: [], totalCount: 0, hasMore: false }),
			} as Response);

			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'First Match' }), createStory({ title: 'Second Match' })],
			};

			// Start first search but don't await
			const promise1 = service.executeSearch(stories, categories);

			// Start second search immediately
			service.updateFromInput('second', 6);
			const promise2 = service.executeSearch(stories, categories);

			await vi.advanceTimersByTimeAsync(350);

			// Wait for both (first may throw AbortError)
			await promise1.catch(() => {});
			await promise2.catch(() => {});

			// State should reflect second search
			expect(service.state.query).toBe('second');
		});
	});

	describe('navigateSelection', () => {
		it('should move selection down', () => {
			service.state.results = [
				{ story: createStory() as any, categoryId: 'a', categoryName: 'A' },
				{ story: createStory() as any, categoryId: 'b', categoryName: 'B' },
			];
			service.state.selectedIndex = 0;

			service.navigateSelection('down');
			expect(service.state.selectedIndex).toBe(1);
		});

		it('should wrap around when moving down past end', () => {
			service.state.results = [
				{ story: createStory() as any, categoryId: 'a', categoryName: 'A' },
				{ story: createStory() as any, categoryId: 'b', categoryName: 'B' },
			];
			service.state.selectedIndex = 1;

			service.navigateSelection('down');
			expect(service.state.selectedIndex).toBe(0);
		});

		it('should move selection up', () => {
			service.state.results = [
				{ story: createStory() as any, categoryId: 'a', categoryName: 'A' },
				{ story: createStory() as any, categoryId: 'b', categoryName: 'B' },
			];
			service.state.selectedIndex = 1;

			service.navigateSelection('up');
			expect(service.state.selectedIndex).toBe(0);
		});

		it('should wrap around when moving up past start', () => {
			service.state.results = [
				{ story: createStory() as any, categoryId: 'a', categoryName: 'A' },
				{ story: createStory() as any, categoryId: 'b', categoryName: 'B' },
			];
			service.state.selectedIndex = 0;

			service.navigateSelection('up');
			expect(service.state.selectedIndex).toBe(1);
		});

		it('should do nothing with empty results', () => {
			service.state.results = [];
			service.state.selectedIndex = 0;

			service.navigateSelection('down');
			expect(service.state.selectedIndex).toBe(0);
		});
	});

	describe('getSelectedResult', () => {
		it('should return the selected result', () => {
			const result = {
				story: createStory() as any,
				categoryId: 'a',
				categoryName: 'A',
			};
			service.state.results = [result];
			service.state.selectedIndex = 0;

			expect(service.getSelectedResult()).toEqual(result);
		});

		it('should return null for empty results', () => {
			service.state.results = [];
			expect(service.getSelectedResult()).toBeNull();
		});
	});

	describe('combineResults (via executeSearch)', () => {
		it('should deduplicate results by title when combining local and historical', async () => {
			service.updateFromInput('climate', 7);

			const stories: Record<string, Story[]> = {
				world: [createStory({ title: 'Climate Change Summit' })],
			};

			// Mock historical search returning a duplicate
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [
						{
							story: {
								title: 'Climate Change Summit',
								short_summary: 'Historical version',
							},
							categoryId: 'world',
							categoryName: 'World',
							batchId: 'old-batch',
							batchDate: '2025-01-01',
						},
						{
							story: {
								title: 'Climate Action Plan',
								short_summary: 'Different story',
							},
							categoryId: 'world',
							categoryName: 'World',
							batchId: 'old-batch',
							batchDate: '2025-01-01',
						},
					],
					totalCount: 2,
					hasMore: false,
				}),
			} as Response);

			const onHistoricalComplete = vi.fn();
			const promise = service.executeSearch(
				stories,
				categories,
				undefined,
				undefined,
				undefined,
				onHistoricalComplete,
			);

			await vi.advanceTimersByTimeAsync(350);
			await promise;

			// Should have 2 results: 1 local "Climate Change Summit" + 1 historical "Climate Action Plan"
			// The duplicate "Climate Change Summit" from historical should be deduplicated
			expect(service.state.results).toHaveLength(2);
			expect(service.state.results[0].story.title).toBe('Climate Change Summit');
			expect(service.state.results[1].story.title).toBe('Climate Action Plan');
		});
	});
});
