/**
 * Self-contained sync watcher for settings
 * Tracks setting changes and syncs them when appropriate
 */

import { browser } from '$app/environment';
import { settings } from '$lib/data/settings.svelte';
import { syncManager } from './sync-manager';

export class SyncSettingsWatcher {
	// Keep a copy of last synced values
	private lastSyncedValues = new Map<string, unknown>();
	private initialized = false;

	constructor() {
		if (browser) {
			// Don't auto-initialize - wait for explicit initialization
		}
	}

	initialize() {
		// Reset and load initial values into our tracking map
		this.lastSyncedValues.clear();
		Object.values(settings).forEach((setting) => {
			// Skip sync_local settings (they don't sync)
			if (setting.category !== 'sync_local') {
				// Deep clone the value to avoid reference issues
				try {
					const clonedValue = JSON.parse(JSON.stringify(setting.currentValue));
					this.lastSyncedValues.set(setting.key, clonedValue);
				} catch {
					// If JSON serialization fails, just store the value directly
					this.lastSyncedValues.set(setting.key, setting.currentValue);
				}
			}
		});
		this.initialized = true;
	}

	/**
	 * Check for changes and sync them
	 * This should be called after settings are saved
	 */
	checkForChanges() {
		console.log('[SyncWatcher] checkForChanges called, initialized:', this.initialized);
		if (!this.initialized) return;

		// Check if sync is enabled
		const syncEnabled = settings.syncSettings.currentValue;
		console.log('[SyncWatcher] syncEnabled:', syncEnabled);
		if (!syncEnabled) {
			console.log('[SyncWatcher] Sync disabled, skipping');
			return;
		}

		// Detect and sync changes
		const changes = this.detectAndGatherChanges();
		console.log('[SyncWatcher] Detected changes:', changes);

		// If we have changes, sync them
		if (changes.length > 0) {
			console.log('[SyncWatcher] Syncing changes:', changes);

			// Track each changed setting ONCE
			changes.forEach((change) => {
				console.log('[SyncWatcher] Tracking change:', change);
				syncManager.trackChange('setting', 'update', {
					key: change.key,
					value: change.value,
				});
			});

			// Reset our baseline after tracking changes
			this.initialize();
		} else {
			console.log('[SyncWatcher] No changes detected, skipping sync');
		}
	}

	/**
	 * Detect what settings have changed since last sync
	 */
	private detectAndGatherChanges(): Array<{ key: string; value: unknown }> {
		const changes: Array<{ key: string; value: unknown }> = [];
		const seen = new Set<string>(); // Track what we've already added

		Object.values(settings).forEach((setting) => {
			// Skip sync_local settings (they don't sync)
			if (setting.category === 'sync_local') {
				return;
			}

			// Check if value changed from our tracking map
			const lastValue = this.lastSyncedValues.get(setting.key);
			const currentValue = setting.currentValue;

			// Deep comparison for objects
			let hasChanged = false;
			try {
				hasChanged = JSON.stringify(lastValue) !== JSON.stringify(currentValue);
			} catch {
				// If JSON serialization fails, do simple comparison
				hasChanged = lastValue !== currentValue;
			}

			if (hasChanged && !seen.has(setting.key)) {
				console.log(`[SyncWatcher] Setting changed: ${setting.key}`, {
					old: lastValue,
					new: currentValue,
				});

				// Check if this should be stored based on the storage strategy
				const shouldStore = setting.shouldStore();

				// Add to changes array ONLY if not already added
				// If shouldStore is false, we send null to delete from DB
				changes.push({
					key: setting.key,
					value: shouldStore ? currentValue : null,
				});
				seen.add(setting.key);

				// DON'T update our tracking map here - do it after sync
			}
		});

		return changes;
	}

	/**
	 * Force sync all settings (for initial sync when enabling)
	 */
	syncAllSettings() {
		console.log('[SyncWatcher] Force syncing all settings');

		const changes: Array<{ key: string; value: unknown }> = [];

		Object.values(settings).forEach((setting) => {
			// Skip sync_local settings
			if (setting.category === 'sync_local') {
				return;
			}

			// Check if this should be stored
			const shouldStore = setting.shouldStore();

			if (shouldStore) {
				changes.push({
					key: setting.key,
					value: setting.currentValue,
				});
			}
		});

		console.log('[SyncWatcher] Syncing all settings:', changes.length, 'settings');

		// Track all settings
		changes.forEach((change) => {
			syncManager.trackChange('setting', 'update', {
				key: change.key,
				value: change.value,
			});
		});

		// Update our baseline
		this.initialize();
	}
}

// Create singleton instance
export const syncSettingsWatcher = browser ? new SyncSettingsWatcher() : null;
