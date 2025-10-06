import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearWikipediaCache,
	fetchWikipediaContent,
	getWikipediaCacheSize,
} from '../wikipediaService';

// Mock fetch
global.fetch = vi.fn();

describe('WikipediaService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearWikipediaCache();
	});

	describe('fetchWikipediaContent', () => {
		it('should fetch Wikipedia content for a regular page ID', async () => {
			const mockResponse = {
				extract: 'Test content',
				thumbnail: { source: 'thumb.jpg' },
				originalimage: { source: 'full.jpg' },
				title: 'Test Article',
				content_urls: {
					desktop: { page: 'https://en.wikipedia.org/wiki/Test' },
				},
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await fetchWikipediaContent('Test_Article');

			expect(fetch).toHaveBeenCalledWith(
				'https://en.wikipedia.org/api/rest_v1/page/summary/Test_Article',
			);
			expect(result).toEqual({
				extract: 'Test content',
				thumbnail: { source: 'thumb.jpg' },
				originalImage: { source: 'full.jpg' },
				title: 'Test Article',
				wikiUrl: 'https://en.wikipedia.org/wiki/Test',
			});
		});

		it('should handle Wikidata Q-IDs', async () => {
			// First mock the Wikidata API response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					entities: {
						Q42: {
							sitelinks: {
								enwiki: { title: 'Douglas Adams' },
							},
						},
					},
				}),
			} as Response);

			// Then mock the Wikipedia API response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					extract: 'Douglas Adams was a writer',
					title: 'Douglas Adams',
				}),
			} as Response);

			const result = await fetchWikipediaContent('Q42');

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('wikidata.org'));
			expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('Douglas%20Adams'));
			expect(result.extract).toBe('Douglas Adams was a writer');
		});

		it('should cache results', async () => {
			const mockResponse = {
				extract: 'Cached content',
				title: 'Cached Article',
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			// First call
			const result1 = await fetchWikipediaContent('Cached_Article');
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(getWikipediaCacheSize()).toBe(1);

			// Second call should use cache
			const result2 = await fetchWikipediaContent('Cached_Article');
			expect(fetch).toHaveBeenCalledTimes(1); // No additional fetch
			expect(result1).toBe(result2); // Same reference
		});

		it('should handle API errors gracefully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Not Found',
			} as Response);

			const result = await fetchWikipediaContent('Nonexistent');

			expect(result).toEqual({
				extract: 'Failed to load Wikipedia content.',
				thumbnail: null,
				originalImage: null,
				title: '',
				wikiUrl: '',
			});
		});

		it('should handle network errors', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			const result = await fetchWikipediaContent('Test');

			expect(result).toEqual({
				extract: 'Failed to load Wikipedia content.',
				thumbnail: null,
				originalImage: null,
				title: '',
				wikiUrl: '',
			});
		});
	});

	describe('cache management', () => {
		it('should clear cache', async () => {
			const mockResponse = { extract: 'Test', title: 'Test' };

			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			await fetchWikipediaContent('Test1');
			await fetchWikipediaContent('Test2');
			expect(getWikipediaCacheSize()).toBe(2);

			clearWikipediaCache();
			expect(getWikipediaCacheSize()).toBe(0);
		});
	});
});
