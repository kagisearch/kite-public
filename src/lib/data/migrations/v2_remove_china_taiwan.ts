/**
 * Migration: v2_remove_china_taiwan
 *
 * Migrates from old "China_Taiwan" category to new "Taiwan" category.
 *
 * ## Background
 * The category "China_Taiwan" was renamed to "Taiwan" in the backend.
 * Users who had the old category in their settings need to be migrated.
 *
 * ## Migration Logic
 *
 * ### Case 1: Taiwan is already enabled
 * - Remove "China_Taiwan" from categoryOrder, enabledCategories, and disabledCategories
 *
 * ### Case 2: China_Taiwan is enabled (Taiwan not present)
 * - Add "Taiwan" to enabledCategories
 * - Remove "China_Taiwan" from categoryOrder and enabledCategories
 *
 * ### Case 3: China_Taiwan is disabled or not present
 * - Remove "China_Taiwan" from categoryOrder and disabledCategories
 *
 * ## Expected Outcome
 * - All references to "China_Taiwan" are removed
 * - Users who had "China_Taiwan" enabled will have "Taiwan" enabled
 * - Users who had "China_Taiwan" disabled will not have "Taiwan" added
 */

import { settings } from '../settings.svelte';
import type { Migration } from './types';

const OLD_CATEGORY = 'china_|_taiwan';
const NEW_CATEGORY = 'taiwan';

export const v2_remove_china_taiwan: Migration = {
	id: 'v2_remove_china_taiwan',
	description: 'Migrate China_Taiwan category to Taiwan',

	run() {
		const categoryOrder = settings.categoryOrder.currentValue;
		const enabledCategories = settings.enabledCategories.currentValue;
		const disabledCategories = settings.disabledCategories.currentValue;

		// Check if old category exists anywhere
		const hasOldCategory =
			categoryOrder.includes(OLD_CATEGORY) ||
			enabledCategories.includes(OLD_CATEGORY) ||
			disabledCategories.includes(OLD_CATEGORY);

		if (!hasOldCategory) {
			console.log('[Migration] v2_remove_china_taiwan skipped (no China_Taiwan found)');
			return;
		}

		console.log('[Migration] Running v2_remove_china_taiwan', {
			from: {
				categoryOrder,
				enabledCategories,
				disabledCategories,
			},
		});

		let needsSave = false;

		// Case 1 & 2: Check if Taiwan is already enabled or if China_Taiwan is enabled
		const hasTaiwanEnabled = enabledCategories.includes(NEW_CATEGORY);
		const hasChinaTaiwanEnabled = enabledCategories.includes(OLD_CATEGORY);

		if (!hasTaiwanEnabled && hasChinaTaiwanEnabled) {
			// Case 2: China_Taiwan is enabled, Taiwan is not - add Taiwan to enabled
			const newEnabled = enabledCategories
				.filter((cat) => cat !== OLD_CATEGORY)
				.concat(NEW_CATEGORY);
			settings.enabledCategories.currentValue = newEnabled;
			needsSave = true;
			console.log('[Migration] Added Taiwan to enabled categories (replacing China_Taiwan)');
		} else if (hasChinaTaiwanEnabled) {
			// Case 1: Taiwan is already enabled - just remove China_Taiwan
			const newEnabled = enabledCategories.filter((cat) => cat !== OLD_CATEGORY);
			settings.enabledCategories.currentValue = newEnabled;
			needsSave = true;
			console.log(
				'[Migration] Removed China_Taiwan from enabled categories (Taiwan already present)',
			);
		}

		// Remove China_Taiwan from categoryOrder
		if (categoryOrder.includes(OLD_CATEGORY)) {
			const newOrder = categoryOrder.filter((cat) => cat !== OLD_CATEGORY);
			settings.categoryOrder.currentValue = newOrder;
			needsSave = true;
			console.log('[Migration] Removed China_Taiwan from category order');
		}

		// Remove China_Taiwan from disabledCategories
		if (disabledCategories.includes(OLD_CATEGORY)) {
			const newDisabled = disabledCategories.filter((cat) => cat !== OLD_CATEGORY);
			settings.disabledCategories.currentValue = newDisabled;
			needsSave = true;
			console.log('[Migration] Removed China_Taiwan from disabled categories');
		}

		// Save all changes
		if (needsSave) {
			settings.categoryOrder.save();
			settings.enabledCategories.save();
			settings.disabledCategories.save();

			console.log('[Migration] v2_remove_china_taiwan complete', {
				to: {
					categoryOrder: settings.categoryOrder.currentValue,
					enabledCategories: settings.enabledCategories.currentValue,
					disabledCategories: settings.disabledCategories.currentValue,
				},
			});
		}
	},
};
