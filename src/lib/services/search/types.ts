import type { Story } from '$lib/types';

// Core search types
export interface SearchStory extends Story {
	matchedFields?: string[];
	snippet?: string;
}

export interface SearchResult {
	story: SearchStory;
	categoryId: string;
	categoryName: string;
	batchId?: string;
	batchDate?: string;
}

export interface SearchFilter {
	type: 'category' | 'date' | 'from' | 'to';
	value: string;
	display: string;
	isValid: boolean;
}

export interface FilterContext {
	type: 'category' | 'date' | 'from' | 'to' | 'suggestion';
	partialValue: string;
	fullMatch: string;
	startIndex: number;
	suggestions?: string[];
}

export interface FilterSuggestion {
	value: string;
	label: string;
	display: string;
	isFilterType?: boolean;
}

export interface SearchState {
	query: string;
	filters: SearchFilter[];
	results: SearchResult[];
	isLoading: boolean;
	isLoadingMore: boolean;
	hasMore: boolean;
	selectedIndex: number;
	totalCount: number;
	currentOffset: number;
	allHistoricalResults: SearchResult[];
}

export interface SearchOptions {
	includeLocal: boolean;
	includeHistorical: boolean;
	limit: number;
	offset?: number;
	abortSignal?: AbortSignal;
}

// Search constants
export const DEFAULT_SEARCH_LIMIT = 100;
