import { languageSettings } from '$lib/data/settings.svelte.js';
import type { Category, Story } from '$lib/types';
import type { SearchFilter, SearchOptions, SearchResult, SearchStory } from './types';

interface HistoricalSearchApiResponse {
	results: Array<{
		story: SearchStory;
		categoryId: string;
		categoryName: string;
		batchId?: string;
		batchDate?: string;
	}>;
	hasMore: boolean;
	totalCount: number;
}

export interface SearchExecutionResult {
	localResults: SearchResult[];
	historicalResults: SearchResult[];
	hasMore: boolean;
	localCount: number;
	historicalCount: number;
}

export class SearchExecutorService {
	/**
	 * Execute search with both local and historical results
	 */
	async executeSearch(
		query: string,
		filters: SearchFilter[],
		allCategoryStories: Record<string, Story[]>,
		categories: Category[],
		options: SearchOptions = {
			includeLocal: true,
			includeHistorical: true,
			limit: 100,
		},
	): Promise<SearchExecutionResult> {
		const results = {
			localResults: [] as SearchResult[],
			historicalResults: [] as SearchResult[],
			hasMore: false,
			localCount: 0,
			historicalCount: 0,
		};

		// Get local results if requested
		if (options.includeLocal && (query || filters.length > 0)) {
			results.localResults = this.searchLocal(query, filters, allCategoryStories, categories);
			results.localCount = results.localResults.length;
		}

		// Get historical results if requested
		if (options.includeHistorical && (query || filters.length > 0)) {
			const historicalData = await this.searchHistorical(query, filters, options);
			results.historicalResults = historicalData.results;
			results.historicalCount = historicalData.total;
			results.hasMore = historicalData.hasMore;
		}

		return results;
	}

	/**
	 * Search through local category stories
	 */
	private searchLocal(
		query: string,
		filters: SearchFilter[],
		allCategoryStories: Record<string, Story[]>,
		categories: Category[],
	): SearchResult[] {
		const results: SearchResult[] = [];

		// Local search works for any query length
		const lowerQuery = query.toLowerCase();

		// Get active category filter
		const categoryFilter = filters.find((f) => f.type === 'category' && f.isValid);

		// Search through categories
		for (const [categoryId, stories] of Object.entries(allCategoryStories)) {
			const category = categories.find((c) => c.id === categoryId);
			if (!category) continue;

			// Skip if category filter is active and doesn't match
			if (categoryFilter && categoryId.toLowerCase() !== categoryFilter.value.toLowerCase()) {
				continue;
			}

			// Search stories in this category
			for (const story of stories) {
				const matchResult = this.matchStory(story, lowerQuery);
				if (matchResult.matches) {
					results.push({
						story: {
							...story,
							matchedFields: matchResult.matchedFields,
							snippet: matchResult.snippet,
						},
						categoryId,
						categoryName: category.name,
					});
				}
			}
		}

		// Sort by relevance (number of matched fields, then by title)
		results.sort((a, b) => {
			const aFields = a.story.matchedFields?.length || 0;
			const bFields = b.story.matchedFields?.length || 0;

			if (aFields !== bFields) {
				return bFields - aFields; // More matches first
			}

			return (a.story.title || '').localeCompare(b.story.title || '');
		});

		return results;
	}

	/**
	 * Check if a story matches the search query
	 */
	private matchStory(
		story: Story,
		query: string,
	): {
		matches: boolean;
		matchedFields: string[];
		snippet: string;
	} {
		if (!query) return { matches: true, matchedFields: [], snippet: '' };

		const matchedFields: string[] = [];
		let snippet = '';

		// Define searchable fields with weights
		const searchableFields = {
			title: story.title || '',
			short_summary: story.short_summary || '',
			did_you_know: story.did_you_know || '',
			talking_points: story.talking_points?.join(' ') || '',
			quote: story.quote || '',
			location: story.location || '',
		};

		// Search each field
		for (const [fieldName, fieldValue] of Object.entries(searchableFields)) {
			if (fieldValue.toLowerCase().includes(query)) {
				matchedFields.push(fieldName);

				// Use the first match as snippet
				if (!snippet && fieldValue.length > 0) {
					snippet = this.createSnippet(fieldValue, query);
				}
			}
		}

		return {
			matches: matchedFields.length > 0,
			matchedFields,
			snippet: snippet || (story.short_summary || '').slice(0, 150),
		};
	}

	/**
	 * Create a text snippet with the search query highlighted
	 */
	private createSnippet(text: string, query: string, maxLength: number = 150): string {
		const lowerText = text.toLowerCase();
		const lowerQuery = query.toLowerCase();
		const queryIndex = lowerText.indexOf(lowerQuery);

		if (queryIndex === -1) {
			return text.slice(0, maxLength);
		}

		// Calculate snippet boundaries
		const start = Math.max(0, queryIndex - 50);
		const end = Math.min(text.length, queryIndex + query.length + 50);

		// Adjust boundaries to word boundaries
		let adjustedStart = start;
		let adjustedEnd = end;

		if (start > 0) {
			const spaceIndex = text.indexOf(' ', start);
			if (spaceIndex > 0 && spaceIndex < start + 20) adjustedStart = spaceIndex;
		}

		if (end < text.length) {
			const spaceIndex = text.indexOf(' ', end);
			if (spaceIndex > 0 && spaceIndex < end + 20) adjustedEnd = spaceIndex;
		}

		let snippet = text.slice(adjustedStart, adjustedEnd);

		// Add ellipsis
		if (adjustedStart > 0) snippet = `...${snippet}`;
		if (adjustedEnd < text.length) snippet = `${snippet}...`;

		return snippet;
	}

	/**
	 * Search historical data via API
	 */
	private async searchHistorical(
		query: string,
		filters: SearchFilter[],
		options: SearchOptions,
	): Promise<{
		results: SearchResult[];
		total: number;
		hasMore: boolean;
	}> {
		try {
			const params = new URLSearchParams();

			// Add query if present and meets minimum length
			if (query && query.length >= 3) {
				params.set('q', query);
			}

			// Add filters
			const categoryFilter = filters.find((f) => f.type === 'category' && f.isValid);
			const fromFilter = filters.find((f) => f.type === 'from' && f.isValid);
			const toFilter = filters.find((f) => f.type === 'to' && f.isValid);

			if (categoryFilter) {
				params.set('categoryId', categoryFilter.value);
			}

			if (fromFilter) {
				const date = this.parseFilterDate(fromFilter.value);
				if (date) {
					params.set('from', date.toISOString());
				}
			}

			if (toFilter) {
				const date = this.parseFilterDate(toFilter.value);
				if (date) {
					params.set('to', date.toISOString());
				}
			}

			// Add other params
			params.set('lang', languageSettings.data);
			params.set('limit', options.limit.toString());

			// Add offset if provided
			if (options.offset && options.offset > 0) {
				params.set('offset', options.offset.toString());
			}

			const response = await fetch(`/api/search?${params.toString()}`, {
				signal: options.abortSignal,
			});

			if (!response.ok) {
				throw new Error(`Search failed: ${response.status}`);
			}

			const data = (await response.json()) as HistoricalSearchApiResponse;

			// Convert API results to our format
			const results: SearchResult[] = data.results.map((result) => ({
				story: result.story,
				categoryId: result.categoryId,
				categoryName: result.categoryName,
				batchId: result.batchId,
				batchDate: result.batchDate,
			}));

			return {
				results,
				total: data.totalCount,
				hasMore: data.hasMore,
			};
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw error; // Re-throw abort errors
			}

			console.error('Historical search failed:', error);

			return {
				results: [],
				total: 0,
				hasMore: false,
			};
		}
	}

	/**
	 * Parse filter date value to Date object
	 */
	private parseFilterDate(value: string): Date | null {
		const lower = value.toLowerCase();
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		switch (lower) {
			case 'today':
				return today;

			case 'yesterday': {
				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);
				return yesterday;
			}

			case 'last-week': {
				const weekAgo = new Date(today);
				weekAgo.setDate(weekAgo.getDate() - 7);
				return weekAgo;
			}

			case 'last-month': {
				const monthAgo = new Date(today);
				monthAgo.setMonth(monthAgo.getMonth() - 1);
				return monthAgo;
			}

			default: {
				// Try to parse as ISO date
				const parsed = new Date(value);
				return Number.isNaN(parsed.getTime()) ? null : parsed;
			}
		}
	}
}
