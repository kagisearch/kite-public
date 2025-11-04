/**
 * Migration: v1_language_preferences
 *
 * Migrates old single-language dataLanguage setting to new multi-language system.
 *
 * ## Old Schema
 * ```
 * dataLanguage = 'pt' (or any specific language)
 * contentLanguages = undefined (didn't exist)
 * ```
 *
 * ## New Schema
 * ```
 * dataLanguage = 'custom'
 * contentLanguages = ['pt']  (first is main, rest are additional)
 * ```
 *
 * ## Why This Change?
 * Added support for multi-language preferences where users can specify:
 * - A main language for translations
 * - Additional languages they can read (shown in source)
 *
 * ## Migration Logic
 * - Only runs if dataLanguage is a specific language (not 'default', 'source', 'custom')
 * - Only runs if contentLanguages is empty (not already migrated)
 * - Converts single language to new multi-language structure
 *
 * @see https://github.com/kagisearch/kite/pull/XXX
 */

import type { SupportedLanguage } from '../settings.svelte';
import { settings } from '../settings.svelte';
import type { Migration } from './types';

export const v1_language_preferences: Migration = {
	id: 'v1_language_preferences',
	description: 'Migrate single-language setting to multi-language preferences',

	run() {
		const dataLang = settings.dataLanguage.currentValue;
		const contentLangs = settings.contentLanguages.currentValue;

		// Only migrate if:
		// 1. dataLanguage is set to a specific language (not 'default', 'source', or 'custom')
		// 2. contentLanguages is empty (indicating this hasn't been migrated yet)
		const isSpecificLanguage =
			dataLang !== 'default' && dataLang !== 'source' && dataLang !== 'custom';

		if (isSpecificLanguage && contentLangs.length === 0) {
			console.log('[Migration] Running v1_language_preferences', {
				from: { dataLanguage: dataLang, contentLanguages: contentLangs },
			});

			// Set contentLanguages to the old language
			settings.contentLanguages.currentValue = [dataLang as SupportedLanguage];
			settings.contentLanguages.save();

			// Set dataLanguage to 'custom'
			settings.dataLanguage.currentValue = 'custom';
			settings.dataLanguage.save();

			console.log('[Migration] v1_language_preferences complete', {
				to: {
					dataLanguage: 'custom',
					contentLanguages: [dataLang],
				},
			});
		} else {
			console.log('[Migration] v1_language_preferences skipped (no changes needed)', {
				dataLanguage: dataLang,
				contentLanguages: contentLangs,
			});
		}
	},
};
