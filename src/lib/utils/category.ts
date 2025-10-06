import { s } from '$lib/client/localization.svelte';
import type { Category } from '$lib/types';
import { categoryNameToCamelCase } from './categoryIdTransform';

export function getCategoryDisplayName(category: Category): string {
	if (category.id === 'onthisday') {
		return s('category.todayInHistory') || 'Today in History';
	}

	const camelCaseName = categoryNameToCamelCase(category.name);
	let translatedName = s(`category.${camelCaseName}`);
	if (translatedName === `category.${camelCaseName}`) {
		translatedName = category.name;
	}
	return translatedName;
}
