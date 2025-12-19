/**
 * Settings Migrations System
 *
 * This file orchestrates running all settings migrations.
 * Individual migrations are defined in `/lib/data/migrations/*.ts`
 *
 * ## How to Add a New Migration
 *
 * 1. Create a new file: `/lib/data/migrations/vN_descriptive_name.ts`
 *
 * 2. Define your migration following the template:
 *
 * ```typescript
 * import { settings } from '../settings.svelte';
 * import type { Migration } from './types';
 *
 * export const v2_my_migration: Migration = {
 *   id: 'v2_my_migration',
 *   description: 'Brief description of what this does',
 *   run() {
 *     // Your migration logic here
 *     const oldValue = settings.oldSetting.currentValue;
 *     settings.newSetting.currentValue = transform(oldValue);
 *     settings.newSetting.save();
 *   }
 * };
 * ```
 *
 * 3. Import and add to `/lib/data/migrations/index.ts`:
 *
 * ```typescript
 * import { v2_my_migration } from './v2_my_migration';
 *
 * export const ALL_MIGRATIONS: Migration[] = [
 *   v1_language_preferences,
 *   v2_my_migration,  // ← Add here
 * ];
 * ```
 *
 * 4. Done! The migration will run automatically on next page load.
 *
 * ## Migration Tracking
 *
 * - Completed migrations are stored in localStorage: `kite_migrations_completed`
 * - Each migration runs exactly once per browser/device
 * - Migrations are idempotent (safe to run multiple times)
 * - Migration status syncs across devices
 *
 * ## Best Practices
 *
 * - Keep migrations small and focused (one change per migration)
 * - Add detailed JSDoc comments explaining the change
 * - Make migrations idempotent (safe to run multiple times)
 * - Never delete old migrations (needed for users who haven't migrated yet)
 * - Test migrations with different starting states
 */

import { browser } from '$app/environment';
import { safeGetItem, safeSetItem } from '$lib/client/utils/safe-storage';
import { ALL_MIGRATIONS } from './migrations/index';

const MIGRATIONS_KEY = 'kite_migrations_completed';

/**
 * Get list of completed migrations for this user
 */
function getCompletedMigrations(): string[] {
	if (!browser) return [];
	const completed = safeGetItem(MIGRATIONS_KEY);
	if (!completed) return [];
	try {
		return JSON.parse(completed);
	} catch {
		return [];
	}
}

/**
 * Mark a migration as completed
 */
function markMigrationComplete(migrationId: string) {
	if (!browser) return;
	const completed = getCompletedMigrations();
	if (!completed.includes(migrationId)) {
		completed.push(migrationId);
		safeSetItem(MIGRATIONS_KEY, JSON.stringify(completed));
	}
}

/**
 * Check if a migration has been completed
 */
function isMigrationComplete(migrationId: string): boolean {
	return getCompletedMigrations().includes(migrationId);
}

/**
 * Run all pending migrations
 *
 * This should be called after settings are loaded from localStorage
 * but before they are used by the application.
 */
export function runMigrations() {
	if (!browser) return;

	console.log('[Migrations] Checking for pending migrations...');

	// Run each migration in order
	for (const migration of ALL_MIGRATIONS) {
		if (isMigrationComplete(migration.id)) {
			// Skip completed migrations
			continue;
		}

		console.log(`[Migrations] Running ${migration.id}: ${migration.description}`);

		try {
			// Run the migration
			migration.run();

			// Mark as complete
			markMigrationComplete(migration.id);

			console.log(`[Migrations] ✓ ${migration.id} completed`);
		} catch (error) {
			console.error(`[Migrations] ✗ ${migration.id} failed:`, error);
			// Don't mark as complete if it failed
			// Will retry on next page load
		}
	}

	console.log('[Migrations] All migrations complete');
}
