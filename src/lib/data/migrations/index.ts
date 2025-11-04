/**
 * Migrations Index
 *
 * Import and register all migrations here in chronological order.
 * Each migration file should export a Migration object.
 */

import type { Migration } from './types';
import { v1_language_preferences } from './v1_language_preferences';
import { v2_remove_china_taiwan } from './v2_remove_china_taiwan';

/**
 * All migrations in chronological order (oldest to newest)
 * New migrations should be added to the end of this array
 */
export const ALL_MIGRATIONS: Migration[] = [
	v1_language_preferences,
	v2_remove_china_taiwan,
	// Add new migrations here
];
