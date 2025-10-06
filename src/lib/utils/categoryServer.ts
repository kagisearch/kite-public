import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BACKEND_PROD_PATH } from '$lib/config';
import type { KiteData } from '$lib/types';
import { filenameToCategoryId } from '$lib/utils/categoryIdTransform';
import { logDebug, logError } from '$lib/utils/logger';

// These functions are now imported from the centralized utility

/**
 * Loads the kite.json file (or localized version) and returns parsed data
 */
export async function loadKiteData(language: string = 'default'): Promise<KiteData> {
	let kiteFile = 'kite.json';

	logDebug('Loading kite data', { language });

	// Check if localized version exists
	if (language !== 'default') {
		const localizedFile = `kite_${language}.json`;
		logDebug('Attempting to load localized kite file', { localizedFile });

		try {
			await readFile(join(BACKEND_PROD_PATH, localizedFile), 'utf8');
			kiteFile = localizedFile;
			logDebug('Using localized kite file', { kiteFile });
		} catch {
			logDebug('Localized kite file not found, falling back to default', {
				attemptedFile: localizedFile,
				fallbackFile: 'kite.json',
			});
			// Fall back to default kite.json if localized version doesn't exist
		}
	}

	logDebug('Loading kite data from file', { kiteFile });
	const kiteData = await readFile(join(BACKEND_PROD_PATH, kiteFile), 'utf8');
	const parsed = JSON.parse(kiteData);

	logDebug('Kite data loaded successfully', {
		kiteFile,
		categoriesCount: parsed.categories.length,
		timestamp: parsed.timestamp,
	});

	return parsed;
}

/**
 * Validates if a category ID exists in the available categories
 */
export async function validateCategoryId(
	categoryId: string,
	language: string = 'default',
): Promise<boolean> {
	try {
		logDebug('Validating category ID', { categoryId, language });

		const kiteData = await loadKiteData(language);

		// Extract all available category IDs for debugging
		const availableCategoryIds = kiteData.categories.map((cat) => filenameToCategoryId(cat.file));

		logDebug('Available category IDs', {
			categoryId,
			language,
			availableCategoryIds,
			totalAvailable: availableCategoryIds.length,
		});

		// For localized files, categories might have language suffix
		// Frontend sends clean IDs (e.g., "world"), but localized files contain IDs with suffix (e.g., "world_it")
		const categoryIdsToCheck = [categoryId];
		if (language !== 'default') {
			categoryIdsToCheck.push(`${categoryId}_${language}`);
		}

		logDebug('Category validation strategy', {
			categoryId,
			language,
			categoryIdsToCheck,
			explanation:
				language !== 'default'
					? `Checking for both "${categoryId}" and "${categoryId}_${language}" in localized data`
					: `Checking for "${categoryId}" in default data`,
		});

		// Check if any of the category IDs exist
		const categoryExists = kiteData.categories.some((cat) => {
			const categoryFileId = filenameToCategoryId(cat.file);
			return categoryIdsToCheck.includes(categoryFileId);
		});

		logDebug('Category validation result', {
			categoryId,
			language,
			exists: categoryExists,
			searchedIn: availableCategoryIds,
			checkedFor: categoryIdsToCheck,
		});

		return categoryExists;
	} catch (error) {
		logError('Error validating category ID', {
			error: error instanceof Error ? error.message : String(error),
			categoryId,
			language,
		});
		return false;
	}
}
