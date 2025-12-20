import { s } from '$lib/client/localization.svelte';
import { language } from '$lib/stores/language.svelte';
import type { Category } from '$lib/types';
import { categoryNameToCamelCase } from './categoryIdTransform';
import type { CategoryMetadata } from '$lib/services/categoryMetadataService';

/**
 * Get the display name for a category in the current language.
 *
 * Strategy:
 * 1. For core categories (Kagi-maintained): Use locale files for full i18n
 * 2. For community categories: Use display_names from kite_feeds.json
 * 3. Fallback to category.name if no translation available
 *
 * @param category - The category object
 * @param metadata - Metadata with display_names from kite_feeds.json
 */
export function getCategoryDisplayName(category: Category, metadata: CategoryMetadata): string {
	// Special case for OnThisDay
	if (category.id === 'onthisday') {
		return s('category.todayInHistory') || 'Today in History';
	}

	// For community categories: Use display_names from metadata
	if (!metadata.isCore && metadata.displayNames) {
		const currentLang = language.current === 'default' ? 'en' : language.current;
		const translatedName = metadata.displayNames[currentLang];
		if (translatedName) {
			return translatedName;
		}
	}

	// For core categories: Use locale files
	const camelCaseName = categoryNameToCamelCase(category.name);
	let translatedName = s(`category.${camelCaseName}`);
	if (translatedName === `category.${camelCaseName}`) {
		// No translation found in locale files, use original name
		translatedName = category.name;
	}
	return translatedName;
}
