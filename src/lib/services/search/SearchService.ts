import type { Category, Story } from '$lib/types';
import { type SearchExecutionResult, SearchExecutorService } from './SearchExecutorService';
import { SearchFilterService } from './SearchFilterService';
import type { SearchOptions, SearchResult, SearchState } from './types';
import { DEFAULT_SEARCH_LIMIT } from './types';

export class SearchService {
	private filterService: SearchFilterService;
	private executorService: SearchExecutorService;
	public state: SearchState = {
		query: '',
		filters: [],
		results: [],
		isLoading: false,
		isLoadingMore: false,
		hasMore: false,
		selectedIndex: 0,
		totalCount: 0,
		currentOffset: 0,
		allHistoricalResults: [],
	};

	private abortController: AbortController | null = null;
	private requestId = 0;

	constructor(categories: Category[]) {
		this.filterService = new SearchFilterService(categories);
		this.executorService = new SearchExecutorService();
	}

	/**
	 * Update categories
	 */
	updateCategories(categories: Category[]) {
		this.filterService.updateCategories(categories);
	}

	/**
	 * Get current state
	 */
	getState(): SearchState {
		return { ...this.state };
	}

	/**
	 * Clear all search state
	 */
	clear() {
		this.cancelActiveSearch();

		this.state = {
			query: '',
			filters: [],
			results: [],
			isLoading: false,
			isLoadingMore: false,
			hasMore: false,
			selectedIndex: 0,
			totalCount: 0,
			currentOffset: 0,
			allHistoricalResults: [],
		};
	}

	/**
	 * Update search from input text
	 */
	updateFromInput(inputText: string, _cursorPosition: number = 0) {
		// Only update the query part, filters are handled separately
		this.state.query = inputText;

		// DISABLED: Filter suggestions are for historical search which is disabled
		// Only provide filter suggestions if historical search is enabled
		// if (!features.historicalSearch) {
		return {
			context: null,
			suggestions: [],
		};
		// }

		// Get filter context for suggestions
		// const context = this.filterService.detectFilterContext(
		//   inputText,
		//   cursorPosition,
		// );

		// return {
		//   context,
		//   suggestions: context ? this.filterService.getSuggestions(context) : [],
		// };
	}

	/**
	 * Execute search with progressive updates
	 */
	async executeSearch(
		allCategoryStories: Record<string, Story[]>,
		categories: Category[],
		options?: Partial<SearchOptions>,
		onLocalComplete?: (results: SearchResult[], count: number) => void,
		onHistoricalStart?: () => void,
		onHistoricalComplete?: (results: SearchResult[], count: number) => void,
		_onSearchCancelled?: () => void,
	): Promise<SearchResult[]> {
		// Don't search if no query and no valid filters
		if (!this.state.query && !this.state.filters.some((f) => f.isValid)) {
			this.state.results = [];
			this.state.hasMore = false;
			return [];
		}

		// Cancel any active search
		this.cancelActiveSearch();

		// Set up new search
		this.abortController = new AbortController();
		this.state.isLoading = true;
		this.state.currentOffset = 0;
		this.state.allHistoricalResults = [];
		const currentRequestId = ++this.requestId;

		const searchOptions: SearchOptions = {
			includeLocal: true,
			includeHistorical: true,
			limit: DEFAULT_SEARCH_LIMIT,
			offset: 0,
			abortSignal: this.abortController.signal,
			...options,
		};

		try {
			// Start both searches in parallel
			const localPromise = this.executorService.executeSearch(
				this.state.query,
				this.state.filters,
				allCategoryStories,
				categories,
				{ ...searchOptions, includeLocal: true, includeHistorical: false },
			);

			// Handle local results as soon as they're ready
			localPromise
				.then((localResults) => {
					if (currentRequestId === this.requestId) {
						this.state.results = localResults.localResults;
						this.state.selectedIndex = 0;
						this.state.isLoading = false;
						this.state.totalCount = localResults.localCount;

						if (onLocalComplete) {
							onLocalComplete(localResults.localResults, localResults.localCount);
						}
					}
				})
				.catch((error) => {
					// Silently ignore abort errors
					if (error?.name !== 'AbortError') {
						throw error;
					}
				});

			// Start historical search if eligible and feature is enabled
			// DISABLED: Historical search is too slow on remote database
			const canSearchHistorical = false;
			let historicalPromise: Promise<SearchExecutionResult> | null = null;

			if (searchOptions.includeHistorical !== false && canSearchHistorical) {
				if (onHistoricalStart) {
					onHistoricalStart();
				}

				historicalPromise = this.executorService.executeSearch(
					this.state.query,
					this.state.filters,
					allCategoryStories,
					categories,
					{ ...searchOptions, includeLocal: false, includeHistorical: true },
				);

				// Handle historical results when ready
				historicalPromise
					.then((historicalResults) => {
						if (currentRequestId === this.requestId) {
							// Store historical results
							this.state.allHistoricalResults = historicalResults.historicalResults;

							// Get current local results from state
							const currentLocalResults = this.state.results.filter((r) => !r.batchId);

							// Combine with historical
							const combined = this.combineResults(
								currentLocalResults,
								this.state.allHistoricalResults,
							);

							this.state.results = combined;
							// For the initial search, we've requested items at offset 0
							this.state.hasMore = historicalResults.hasMore;
							this.state.totalCount = historicalResults.historicalCount;
							this.state.currentOffset = 0; // We started at offset 0

							if (onHistoricalComplete) {
								onHistoricalComplete(
									historicalResults.historicalResults,
									historicalResults.historicalCount,
								);
							}
						}
					})
					.catch((error) => {
						// Silently ignore abort errors
						if (error?.name !== 'AbortError') {
							throw error;
						}
					});
			}

			// Wait for both searches to complete
			await localPromise.catch((error) => {
				if (error?.name !== 'AbortError') {
					throw error;
				}
			});

			if (historicalPromise) {
				await historicalPromise.catch((error) => {
					if (error?.name !== 'AbortError') {
						throw error;
					}
				});
			}

			this.state.isLoading = false;
			return this.state.results;
		} catch (error) {
			if (currentRequestId === this.requestId) {
				this.state.isLoading = false;

				if (error instanceof Error && error.name !== 'AbortError') {
					console.error('Search failed:', error);
				}
			}

			throw error;
		}
	}

	/**
	 * Load more historical results
	 */
	async loadMoreResults(
		onMoreLoaded?: (results: SearchResult[], total: number) => void,
	): Promise<void> {
		// Don't load more if already loading or no more results
		if (this.state.isLoadingMore || !this.state.hasMore) {
			return;
		}

		this.state.isLoadingMore = true;
		// Calculate next offset: current offset + limit
		const nextOffset = this.state.currentOffset + DEFAULT_SEARCH_LIMIT;

		try {
			const moreResults = await this.executorService.executeSearch(
				this.state.query,
				this.state.filters,
				{}, // No local stories needed for pagination
				[], // No categories needed for pagination
				{
					includeLocal: false,
					includeHistorical: true,
					limit: DEFAULT_SEARCH_LIMIT,
					offset: nextOffset,
					abortSignal: this.abortController?.signal,
				},
			);

			// Append new historical results
			this.state.allHistoricalResults = [
				...this.state.allHistoricalResults,
				...moreResults.historicalResults,
			];

			// For pagination, just append new results without deduplication
			// Keep existing results and add new ones at the end
			this.state.results = [...this.state.results, ...moreResults.historicalResults];

			// Update pagination state
			this.state.currentOffset = nextOffset; // Update offset to what we just used
			// The backend already tells us if there are more results
			this.state.hasMore = moreResults.hasMore;
			this.state.totalCount = moreResults.historicalCount;

			if (onMoreLoaded) {
				onMoreLoaded(moreResults.historicalResults, this.state.totalCount);
			}
		} catch (error) {
			console.error('Failed to load more results:', error);
		} finally {
			this.state.isLoadingMore = false;
		}
	}

	/**
	 * Combine local and historical results, removing duplicates
	 */
	private combineResults(
		localResults: SearchResult[],
		historicalResults: SearchResult[],
	): SearchResult[] {
		const combined = [...localResults];
		const existingTitles = new Set(localResults.map((r) => r.story.title?.toLowerCase()));

		// Add historical results that don't duplicate local ones
		for (const result of historicalResults) {
			const title = result.story.title?.toLowerCase();
			if (title && !existingTitles.has(title)) {
				combined.push(result);
				existingTitles.add(title);
			}
		}

		return combined;
	}

	/**
	 * Cancel active search
	 */
	private cancelActiveSearch() {
		if (this.abortController && !this.abortController.signal.aborted) {
			this.abortController.abort();
		}
		this.abortController = null;
		// Also clear loading states
		this.state.isLoading = false;
	}

	/**
	 * Navigate selection
	 */
	navigateSelection(direction: 'up' | 'down') {
		if (this.state.results.length === 0) return;

		if (direction === 'down') {
			this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.results.length;
		} else {
			this.state.selectedIndex =
				this.state.selectedIndex === 0
					? this.state.results.length - 1
					: this.state.selectedIndex - 1;
		}
	}

	/**
	 * Get selected result
	 */
	getSelectedResult(): SearchResult | null {
		return this.state.results[this.state.selectedIndex] || null;
	}

	/**
	 * Cleanup - call when component is destroyed
	 */
	destroy() {
		this.cancelActiveSearch();
	}
}
