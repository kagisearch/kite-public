import type { Category } from '$lib/types';
import {
	parseDateValue,
	parseSearchInput,
	type SearchFilter as UtilSearchFilter,
} from '$lib/utils/searchFilters';
import type { FilterContext, FilterSuggestion, SearchFilter } from './types';

export class SearchFilterService {
	private categories: Category[] = [];

	constructor(categories: Category[]) {
		this.categories = categories;
	}

	updateCategories(categories: Category[]) {
		this.categories = categories;
	}

	/**
	 * Parse search input and extract filters
	 */
	parseInput(input: string): { query: string; filters: SearchFilter[] } {
		const parsed = parseSearchInput(input);

		const filters: SearchFilter[] = parsed.filters.map((f) => ({
			type: f.type,
			value: f.value,
			display: f.value,
			isValid: this.validateFilter(f.type, f.value),
		}));

		return {
			query: parsed.query,
			filters,
		};
	}

	/**
	 * Validate a filter value
	 */
	private validateFilter(type: UtilSearchFilter['type'], value: string): boolean {
		switch (type) {
			case 'category':
				return this.categories.some(
					(cat) =>
						cat.id.toLowerCase() === value.toLowerCase() ||
						cat.name.toLowerCase() === value.toLowerCase(),
				);
			case 'date':
			case 'from':
			case 'to':
				return parseDateValue(value) !== null;
			default:
				return false;
		}
	}

	/**
	 * Get filter suggestions based on context
	 */
	getSuggestions(context: FilterContext): FilterSuggestion[] {
		switch (context.type) {
			case 'suggestion':
				return this.getFilterTypeSuggestions(context.partialValue);
			case 'category':
				return this.getCategorySuggestions(context.partialValue);
			case 'date':
			case 'from':
			case 'to':
				return this.getDateSuggestions(context.partialValue);
			default:
				return [];
		}
	}

	/**
	 * Get filter type suggestions (e.g., "cat" -> "category:")
	 */
	private getFilterTypeSuggestions(partial: string): FilterSuggestion[] {
		const filterTypes = ['category', 'from', 'to', 'date'];
		const lower = partial.toLowerCase();

		return filterTypes
			.filter((type) => type.startsWith(lower))
			.map((type) => ({
				value: `${type}:`,
				label: `Use ${type} filter`,
				display: `${type}:`,
				isFilterType: true,
			}));
	}

	/**
	 * Get category suggestions
	 */
	private getCategorySuggestions(partial: string): FilterSuggestion[] {
		const lower = partial.toLowerCase();

		return this.categories
			.filter(
				(cat) => cat.id.toLowerCase().includes(lower) || cat.name.toLowerCase().includes(lower),
			)
			.map((cat) => ({
				value: cat.id,
				label: cat.name,
				display: cat.id,
			}))
			.slice(0, 5);
	}

	/**
	 * Get date suggestions
	 */
	private getDateSuggestions(partial: string): FilterSuggestion[] {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);
		const monthAgo = new Date(today);
		monthAgo.setMonth(monthAgo.getMonth() - 1);

		const baseSuggestions = [
			{ value: 'today', label: today.toLocaleDateString(), display: 'today' },
			{
				value: 'yesterday',
				label: yesterday.toLocaleDateString(),
				display: 'yesterday',
			},
			{
				value: 'last-week',
				label: weekAgo.toLocaleDateString(),
				display: 'last-week',
			},
			{
				value: 'last-month',
				label: monthAgo.toLocaleDateString(),
				display: 'last-month',
			},
			{
				value: today.toISOString().split('T')[0],
				label: 'today',
				display: today.toISOString().split('T')[0],
			},
			{
				value: yesterday.toISOString().split('T')[0],
				label: 'yesterday',
				display: yesterday.toISOString().split('T')[0],
			},
			{
				value: weekAgo.toISOString().split('T')[0],
				label: 'last week',
				display: weekAgo.toISOString().split('T')[0],
			},
			{
				value: monthAgo.toISOString().split('T')[0],
				label: 'last month',
				display: monthAgo.toISOString().split('T')[0],
			},
		];

		if (!partial) {
			return baseSuggestions.slice(0, 6);
		}

		const lower = partial.toLowerCase();
		const filtered = baseSuggestions.filter(
			(s) => s.value.toLowerCase().includes(lower) || s.display.toLowerCase().includes(lower),
		);

		// Add partial ISO date if it looks valid
		if (/^\d{4}(-\d{1,2})?(-\d{1,2})?$/.test(partial)) {
			const parsedDate = parseDateValue(partial);
			if (parsedDate) {
				const label = parsedDate.toLocaleDateString();
				filtered.unshift({
					value: partial,
					label: label,
					display: partial,
				});
			}
		}

		return filtered.slice(0, 8);
	}

	/**
	 * Detect filter context from cursor position in text
	 */
	detectFilterContext(text: string, cursorPosition: number): FilterContext | null {
		// Look for filter patterns around cursor
		const beforeCursor = text.slice(0, cursorPosition);

		// Check for incomplete filter
		const filterPatterns = [
			{ type: 'category' as const, pattern: /category:\s*([^"\s]*|"[^"]*)$/i },
			{ type: 'from' as const, pattern: /from:\s*([^"\s]*|"[^"]*)$/i },
			{ type: 'to' as const, pattern: /to:\s*([^"\s]*|"[^"]*)$/i },
			{ type: 'date' as const, pattern: /date:\s*([^"\s]*|"[^"]*)$/i },
		];

		for (const { type, pattern } of filterPatterns) {
			const match = beforeCursor.match(pattern);
			if (match) {
				const fullMatch = match[0];
				const partialValue = match[1]?.replace(/^"|"$/g, '') || '';

				return {
					type,
					partialValue,
					fullMatch,
					startIndex: cursorPosition - fullMatch.length,
				};
			}
		}

		// Check for filter type suggestions (e.g., "cat", "fr")
		const typeMatch = beforeCursor.match(/\b([a-z]+)$/i);
		if (typeMatch) {
			const partial = typeMatch[1];
			const filterTypes = ['category', 'from', 'to', 'date'];

			if (filterTypes.some((type) => type.startsWith(partial.toLowerCase()))) {
				return {
					type: 'suggestion',
					partialValue: partial,
					fullMatch: partial,
					startIndex: cursorPosition - partial.length,
					suggestions: filterTypes.filter((type) => type.startsWith(partial.toLowerCase())),
				};
			}
		}

		return null;
	}

	/**
	 * Build a filter string for search
	 */
	buildFilterString(filters: SearchFilter[]): string {
		return filters
			.filter((f) => f.isValid)
			.map((f) => {
				const value = f.value.includes(' ') ? `"${f.value}"` : f.value;
				return `${f.type}:${value}`;
			})
			.join(' ');
	}
}
