/**
 * Centralized category ID transformation utilities
 *
 * This module provides a single source of truth for converting between
 * different category naming formats used throughout the application.
 */

/**
 * Transform a category key (from config files) to the actual category ID used in the system
 *
 * Handles all the various transformation rules:
 * - Basic: lowercase
 * - Spaces to underscores
 * - Special delimiter transformations
 * - Hard-coded mappings for legacy categories
 *
 * @param categoryKey - The category key from feeds.py or kite_feeds.json
 * @returns The normalized category ID used throughout the system
 */
export function categoryKeyToId(categoryKey: string): string {
	// Handle specific mappings that don't follow the standard pattern
	const hardcodedMappings: Record<string, string> = {
		Technology: 'tech', // Core category mapping
		'Linux & OSS': 'linux_oss', // Community category mapping
	};

	if (hardcodedMappings[categoryKey]) {
		return hardcodedMappings[categoryKey];
	}

	// Handle special delimiter: "USA | Vermont" -> "usa_|_vermont"
	if (categoryKey.includes(' | ')) {
		return categoryKey.toLowerCase().replace(' | ', '_|_');
	}

	// Standard transformation: spaces to underscores, lowercase
	return categoryKey.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Convert a category name or ID to a valid category ID
 *
 * This function normalizes various category identifiers to the standard
 * category ID format used throughout the application.
 *
 * @param categoryIdOrName - Category ID or name to normalize
 * @param allCategories - Available categories for lookup (optional)
 * @returns Normalized category ID
 */
export function normalizeToId(
	categoryIdOrName: string,
	allCategories?: Array<{ id: string; name: string }>,
): string {
	if (!allCategories) {
		return categoryIdOrName;
	}

	// Find the category by ID first, then by name
	const category = allCategories.find(
		(cat) => cat.id === categoryIdOrName || cat.name === categoryIdOrName,
	);

	return category ? category.id : categoryIdOrName;
}

/**
 * Convert a filename to a category ID
 *
 * @param filename - The JSON filename (e.g., "world.json")
 * @returns Category ID (e.g., "world")
 */
export function filenameToCategoryId(filename: string): string {
	return filename.replace('.json', '');
}

/**
 * Convert a category ID to a filename
 *
 * @param categoryId - The category ID (e.g., "world")
 * @returns JSON filename (e.g., "world.json")
 */
export function categoryIdToFilename(categoryId: string): string {
	return `${categoryId}.json`;
}

/**
 * Convert category name to camelCase for localization keys
 *
 * Used for generating i18n keys like "category.worldNews"
 *
 * @param categoryName - Category name to convert
 * @returns CamelCase version suitable for localization keys
 */
export function categoryNameToCamelCase(categoryName: string): string {
	return categoryName
		.replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
		.split(' ')
		.map((word, index) => {
			if (index === 0) return word.toLowerCase();
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join('');
}

/**
 * Simple URL-safe category normalization
 *
 * @param categoryId - Category ID to normalize for URLs
 * @returns URL-safe category ID (lowercase)
 */
export function normalizeForUrl(categoryId: string): string {
	return categoryId.toLowerCase();
}
