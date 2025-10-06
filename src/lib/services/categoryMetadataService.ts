export interface CategoryMetadata {
	categoryId: string;
	categoryType: 'core' | 'country' | 'region' | 'city' | 'topic' | 'other';
	displayName: string;
	displayNames?: Record<string, string>;
	sourceLanguage?: string;
}

export interface CategoriesMetadataResponse {
	categories: CategoryMetadata[];
}

export interface GroupedCategories {
	core: CategoryMetadata[];
	countries: CategoryMetadata[];
	regions: CategoryMetadata[];
	cities: CategoryMetadata[];
	topics: CategoryMetadata[];
	other: CategoryMetadata[];
}

export interface CategoryGroup {
	type: keyof GroupedCategories;
	title: string;
	icon: string;
	categories: CategoryMetadata[];
}

class CategoryMetadataService {
	private cache: CategoryMetadata[] | null = null;

	/**
	 * Fetch category metadata from the API
	 */
	async loadMetadata(): Promise<CategoryMetadata[]> {
		if (this.cache) {
			return this.cache;
		}

		try {
			const response = await fetch('/api/categories/metadata');
			if (!response.ok) {
				throw new Error(`Failed to load category metadata: ${response.statusText}`);
			}

			const data: CategoriesMetadataResponse = await response.json();
			this.cache = data.categories;
			return this.cache;
		} catch (error) {
			console.error('Error loading category metadata:', error);
			return [];
		}
	}

	/**
	 * Group categories by type
	 */
	groupCategories(categories: CategoryMetadata[]): GroupedCategories {
		return {
			core: categories.filter((c) => c.categoryType === 'core'),
			countries: categories.filter((c) => c.categoryType === 'country'),
			regions: categories.filter((c) => c.categoryType === 'region'),
			cities: categories.filter((c) => c.categoryType === 'city'),
			topics: categories.filter((c) => c.categoryType === 'topic'),
			other: categories.filter((c) => c.categoryType === 'other'),
		};
	}

	/**
	 * Get category groups with metadata for UI display
	 */
	getCategoryGroups(categories: CategoryMetadata[]): CategoryGroup[] {
		const grouped = this.groupCategories(categories);

		const groups: CategoryGroup[] = [
			{
				type: 'core',
				title: 'Core News',
				icon: '📋',
				categories: grouped.core,
			},
			{
				type: 'countries',
				title: 'Countries',
				icon: '🌍',
				categories: grouped.countries,
			},
			{
				type: 'regions',
				title: 'Regions',
				icon: '🗺️',
				categories: grouped.regions,
			},
			{
				type: 'cities',
				title: 'Cities & States',
				icon: '🏙️',
				categories: grouped.cities,
			},
			{
				type: 'topics',
				title: 'Topics',
				icon: '💡',
				categories: grouped.topics,
			},
			{
				type: 'other',
				title: 'Other',
				icon: '📅',
				categories: grouped.other,
			},
		];

		return groups.filter((group) => group.categories.length > 0); // Only show groups with categories
	}

	/**
	 * Find category metadata by ID
	 */
	findCategoryById(
		categories: CategoryMetadata[],
		categoryId: string,
	): CategoryMetadata | undefined {
		return categories.find((c) => c.categoryId === categoryId.toLowerCase());
	}

	/**
	 * Clear cache (useful for testing or manual refresh)
	 */
	clearCache() {
		this.cache = null;
	}
}

// Export singleton instance
export const categoryMetadataService = new CategoryMetadataService();
