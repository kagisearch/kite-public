export interface SearchFilter {
	type: 'category' | 'date' | 'from' | 'to';
	value: string;
	isValid: boolean;
	displayValue?: string;
}

export interface ParsedSearch {
	query: string;
	filters: SearchFilter[];
	rawInput: string;
}

// Filter patterns
const FILTER_PATTERNS = {
	category: /category:\s*("[^"]+"|[^\s]+)/gi,
	date: /date:\s*("[^"]+"|[^\s]+)/gi,
	from: /from:\s*("[^"]+"|[^\s]+)/gi,
	to: /to:\s*("[^"]+"|[^\s]+)/gi,
};

export function parseSearchInput(input: string): ParsedSearch {
	const filters: SearchFilter[] = [];
	let cleanedQuery = input;

	// Extract all filters
	for (const [type, pattern] of Object.entries(FILTER_PATTERNS)) {
		const matches = Array.from(input.matchAll(pattern));
		for (const match of matches) {
			const rawValue = match[1];
			// Remove quotes if present
			const value = rawValue.replace(/^"|"$/g, '');

			filters.push({
				type: type as SearchFilter['type'],
				value,
				isValid: false, // Will be validated by the component
			});

			// Remove this filter from the query
			cleanedQuery = cleanedQuery.replace(match[0], '');
		}
	}

	// Clean up extra spaces
	cleanedQuery = cleanedQuery.trim().replace(/\s+/g, ' ');

	return {
		query: cleanedQuery,
		filters,
		rawInput: input,
	};
}

export function buildSearchInput(query: string, filters: SearchFilter[]): string {
	let result = query;

	for (const filter of filters) {
		if (filter.value) {
			// Add quotes if the value contains spaces
			const value = filter.value.includes(' ') ? `"${filter.value}"` : filter.value;
			result += ` ${filter.type}:${value}`;
		}
	}

	return result.trim();
}

export function getFilterSuggestions(
	filterType: 'category' | 'date' | 'from' | 'to',
	partialValue: string,
	availableCategories?: Array<{ id: string; name: string }>,
): string[] {
	if (filterType === 'category' && availableCategories) {
		const lower = partialValue.toLowerCase();
		return availableCategories
			.filter(
				(cat) => cat.id.toLowerCase().includes(lower) || cat.name.toLowerCase().includes(lower),
			)
			.map((cat) => cat.id)
			.slice(0, 5);
	}

	if (filterType === 'date' || filterType === 'from' || filterType === 'to') {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);
		const monthAgo = new Date(today);
		monthAgo.setMonth(monthAgo.getMonth() - 1);

		const suggestions = [
			'today',
			'yesterday',
			'last-week',
			'last-month',
			today.toISOString().split('T')[0],
			yesterday.toISOString().split('T')[0],
			weekAgo.toISOString().split('T')[0],
			monthAgo.toISOString().split('T')[0],
		];

		if (partialValue) {
			const lower = partialValue.toLowerCase();
			// Match against both the value and any partial ISO date input
			const filteredSuggestions = suggestions.filter((s) => s.toLowerCase().includes(lower));

			// Also try to parse partial ISO dates like "2025", "2025-01", "2025-01-20"
			if (/^\d{4}(-\d{1,2})?(-\d{1,2})?$/.test(partialValue)) {
				// Add the partial date as a suggestion if it looks valid
				filteredSuggestions.unshift(partialValue);
			}

			return filteredSuggestions.slice(0, 8);
		}
		return suggestions.slice(0, 5);
	}

	return [];
}

export function parseDateValue(value: string): Date | null {
	const lower = value.toLowerCase();
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (lower === 'today') {
		return today;
	}

	if (lower === 'yesterday') {
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		return yesterday;
	}

	if (lower === 'last-week' || lower === 'lastweek') {
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);
		return weekAgo;
	}

	if (lower === 'last-month' || lower === 'lastmonth') {
		const monthAgo = new Date(today);
		monthAgo.setMonth(monthAgo.getMonth() - 1);
		return monthAgo;
	}

	// Try to parse as ISO date (handles YYYY, YYYY-MM, YYYY-MM-DD)
	let dateString = value;

	// Handle partial ISO dates - pad them to be valid
	if (/^\d{4}$/.test(value)) {
		// Just year: use January 1st
		dateString = `${value}-01-01`;
	} else if (/^\d{4}-\d{1,2}$/.test(value)) {
		// Year and month: use first day of month
		const [year, month] = value.split('-');
		dateString = `${year}-${month.padStart(2, '0')}-01`;
	} else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
		// Full date: normalize month and day padding
		const parts = value.split('-');
		dateString = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
	}

	const parsed = new Date(dateString);
	if (!Number.isNaN(parsed.getTime())) {
		return parsed;
	}

	return null;
}
