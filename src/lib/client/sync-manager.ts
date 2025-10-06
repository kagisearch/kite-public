import { browser } from '$app/environment';
import { db, kiteDB } from '$lib/db/dexie';
import type {
	LocalChange,
	LocalChangeData,
	ReadHistoryChange,
	RemoteSetting,
	SyncConflict,
	SyncResponse,
	SyncState,
} from '$lib/types/sync';
import { getOrCreateDeviceId } from './utils/device-id';
import { safeGetItem, safeRemoveItem, safeSetItem } from './utils/safe-storage';

class SyncManager {
	public deviceId: string;
	private userId: string | null = null;
	private isLoggedIn: boolean = false;
	private syncState: SyncState = {
		isSyncing: false,
		lastSyncedAt: null,
		pendingChanges: 0,
		syncError: null,
		isOnline: true,
	};
	private syncStateListeners: Array<(state: SyncState) => void> = [];
	private pendingChanges: LocalChange[] = [];
	private syncInterval: ReturnType<typeof setInterval> | null = null;
	private conflictResolutionStrategy: 'local' | 'remote' | 'merge' = 'merge';
	private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private syncQueued = false;

	constructor() {
		// Get or create device ID using shared utility
		this.deviceId = getOrCreateDeviceId();

		if (browser) {
			// Monitor online/offline status
			this.setupNetworkMonitoring();

			// Setup storage event listener for cross-tab sync
			this.setupStorageListener();

			// Load pending changes from localStorage
			this.loadPendingChanges();
		}
	}

	private updateSyncState(updates: Partial<SyncState>) {
		this.syncState = { ...this.syncState, ...updates };
		this.notifySyncStateListeners();
	}

	private notifySyncStateListeners() {
		this.syncStateListeners.forEach((listener) => {
			try {
				listener(this.syncState);
			} catch (error) {
				console.error('Error in sync state listener:', error);
			}
		});
	}

	private setupNetworkMonitoring() {
		window.addEventListener('online', () => {
			this.updateSyncState({ isOnline: true });
			this.sync(); // Sync when coming back online
		});

		window.addEventListener('offline', () => {
			this.updateSyncState({ isOnline: false });
		});

		// Set initial state
		this.updateSyncState({ isOnline: navigator.onLine });

		// Setup visibility change listener for syncing when tab becomes visible
		this.setupVisibilityListener();
	}

	private setupVisibilityListener() {
		// Sync when tab becomes visible to get any missed updates
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible' && this.userId) {
				console.log('[Sync] Tab became visible, syncing to get any missed updates');
				// Sync to get any missed updates and resolve conflicts
				this.sync();
			}
		});
	}

	private setupStorageListener() {
		// Listen for changes from other tabs
		window.addEventListener('storage', (e) => {
			if (e.key === 'sync_trigger' && e.newValue) {
				const trigger = JSON.parse(e.newValue);
				if (trigger.deviceId !== this.deviceId) {
					// Another tab made changes, sync
					this.debouncedSync();
				}
			}
		});
	}

	private loadPendingChanges() {
		const stored = safeGetItem('pendingChanges');
		if (stored) {
			try {
				const parsed: unknown = JSON.parse(stored);
				// Convert timestamp strings back to Date objects
				if (Array.isArray(parsed)) {
					this.pendingChanges = parsed.map((change) => ({
						...change,
						timestamp: new Date(change.timestamp),
					})) as LocalChange[];
				}
				this.updateSyncState({ pendingChanges: this.pendingChanges.length });
			} catch (error) {
				console.error('Failed to load pending changes:', error);
				this.pendingChanges = [];
			}
		}
	}

	private savePendingChanges() {
		safeSetItem('pendingChanges', JSON.stringify(this.pendingChanges));
		this.updateSyncState({ pendingChanges: this.pendingChanges.length });
	}

	/**
	 * Track a local change for syncing
	 */
	trackChange(
		type: LocalChange['type'],
		operation: LocalChange['operation'],
		data: LocalChangeData,
	) {
		// Check if sync is enabled for this type of change
		const syncSettings = this.getSyncSetting('syncSettings', true);
		const syncReadHistory = this.getSyncSetting('syncReadHistory', true);

		console.log('[Sync] trackChange called:', {
			type,
			operation,
			syncSettings,
			syncReadHistory,
			data,
		});

		let shouldSync = false;
		if (type === 'setting') {
			shouldSync = syncSettings;
		} else if (type === 'read_history') {
			shouldSync = syncReadHistory;
		}

		if (!shouldSync) {
			console.log('[Sync] Skipping change tracking - sync disabled for type:', type);
			return; // Don't track changes if sync is disabled for this type
		}

		const change: LocalChange = {
			type,
			operation,
			data,
			timestamp: new Date(),
		};

		this.pendingChanges.push(change);
		console.log('[Sync] Added to pendingChanges, now have:', this.pendingChanges.length, 'changes');
		this.savePendingChanges();

		// Notify other tabs
		safeSetItem(
			'sync_trigger',
			JSON.stringify({
				deviceId: this.deviceId,
				timestamp: Date.now(),
			}),
		);

		// Trigger sync with debounce
		this.debouncedSync();
	}

	/**
	 * Debounced sync to batch changes
	 */
	private debouncedSync() {
		if (this.syncDebounceTimer) {
			clearTimeout(this.syncDebounceTimer);
		}

		this.syncDebounceTimer = setTimeout(() => {
			this.sync();
		}, 2000); // Wait 2 seconds to batch changes
	}

	/**
	 * Main sync method
	 */
	async sync(forceAllSettings = false, forceSync = false): Promise<boolean> {
		console.log('[Sync] sync() called', {
			userId: this.userId,
			isOnline: this.syncState.isOnline,
			isSyncing: this.syncState.isSyncing,
			pendingChanges: this.pendingChanges.length,
		});

		if (!this.isLoggedIn || !this.syncState.isOnline) {
			console.log('[Sync] Skipping sync - user not logged in or offline', {
				isLoggedIn: this.isLoggedIn,
				isOnline: this.syncState.isOnline,
			});
			return false;
		}

		// If already syncing, queue another sync for after this one completes
		if (this.syncState.isSyncing) {
			console.log('[Sync] Already syncing - queueing another sync');
			this.syncQueued = true;
			return false;
		}

		// Check if sync is enabled for settings and read history
		const syncSettings = this.getSyncSetting('syncSettings', true);
		const syncReadHistory = this.getSyncSetting('syncReadHistory', true);

		console.log('[Sync] Sync settings:', {
			syncSettings,
			syncReadHistory,
		});

		if (!syncSettings && !syncReadHistory) {
			console.log('[Sync] No sync enabled - skipping');
			return false; // No sync enabled
		}

		this.updateSyncState({ isSyncing: true, syncError: null });

		// Extract and remove changes to sync from pendingChanges
		const changesToSync = [...this.pendingChanges];
		this.pendingChanges = [];
		this.savePendingChanges();

		try {
			// Prepare sync data from the captured changes
			const syncData = await this.prepareSyncData(forceAllSettings, changesToSync);

			// Check if there's actually data to sync
			const hasData = syncData.settings && syncData.settings.length > 0;

			if (!hasData && !forceSync) {
				console.log('[Sync] No data to sync, skipping');
				return true; // Consider it successful since there's nothing to do
			}

			console.log('[Sync] Syncing data:', {
				settings: syncData.settings?.length || 0,
			});

			// Send to server
			const response = await fetch('/api/sync', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(syncData),
			});

			if (!response.ok) {
				throw new Error(`Sync failed: ${response.statusText}`);
			}

			const result = await response.json();

			// Process sync response
			await this.processSyncResponse(result);

			// Changes were already removed before sync, nothing to clean up here
			// Any new changes added during sync are still in this.pendingChanges

			// Update last sync time
			this.updateSyncState({ lastSyncedAt: new Date(result.syncedAt) });
			safeSetItem(`lastSync_${this.userId}`, result.syncedAt);

			return true;
		} catch (error) {
			console.error('Sync error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			// Restore the changes we tried to sync (prepend to preserve order)
			this.pendingChanges = [...changesToSync, ...this.pendingChanges];
			this.savePendingChanges();

			// If offline, changes will be synced when back online
			const isOnline = navigator.onLine;
			this.updateSyncState({
				syncError: errorMessage,
				isOnline,
			});

			return false;
		} finally {
			this.updateSyncState({ isSyncing: false });

			// Check if we need another sync (new changes added during this sync)
			if (this.pendingChanges.length > 0 || this.syncQueued) {
				this.syncQueued = false;
				console.log('[Sync] Running another sync - new changes detected');
				setTimeout(() => this.sync(), 100); // Small delay to avoid stack overflow
			}
		}
	}

	/**
	 * Prepare data for syncing
	 */
	private async prepareSyncData(forceAllSettings = false, changesToSync?: LocalChange[]) {
		// Check sync preferences
		const syncSettings = this.getSyncSetting('syncSettings', true);
		const _syncReadHistory = this.getSyncSetting('syncReadHistory', true);

		// Gather data based on user preferences AND specific changes
		const [localSettings] = await Promise.all([
			syncSettings
				? this.gatherLocalSettings(forceAllSettings, changesToSync)
				: Promise.resolve([]),
			// Note: Read history is handled separately via syncReadHistory()
		]);

		return {
			deviceId: this.deviceId,
			lastSyncedAt: this.syncState.lastSyncedAt, // Will be serialized to ISO string in JSON.stringify
			settings: localSettings,
			// readHistory is handled via separate endpoints
		};
	}

	/**
	 * Get sync setting value
	 */
	private getSyncSetting(key: string, defaultValue: boolean): boolean {
		try {
			// For sync settings, always return false if user is not logged in
			if ((key === 'syncSettings' || key === 'syncReadHistory') && !this.isLoggedIn) {
				return false;
			}

			const stored = safeGetItem(key);
			return stored ? JSON.parse(stored) : defaultValue;
		} catch {
			return defaultValue;
		}
	}

	/**
	 * Gather local settings for sync
	 */
	private async gatherLocalSettings(forceAllSettings = false, changesToSync?: LocalChange[]) {
		const localSettings = [];
		const processedKeys = new Set<string>();

		// Use provided changes or current pending changes
		const changes = changesToSync || this.pendingChanges;

		console.log(
			'[Sync] gatherLocalSettings - changes:',
			changes.length,
			'forceAll:',
			forceAllSettings,
		);

		// Process pending changes that are settings
		for (const change of changes) {
			if (change.type === 'setting' && change.operation === 'update') {
				// Ensure timestamp is a Date object
				const timestamp =
					typeof change.timestamp === 'string' ? new Date(change.timestamp) : change.timestamp;

				// If value is null, it means the setting was removed from localStorage
				if (change.data.value === null) {
					localSettings.push({
						key: change.data.key,
						value: null, // This signals deletion
						version: 1,
						updatedAt: timestamp,
						operation: 'delete', // Mark for deletion
					});
				} else {
					localSettings.push({
						key: change.data.key,
						value: change.data.value,
						version: 1,
						updatedAt: timestamp,
					});
				}
				processedKeys.add(change.data.key);
			}
		}

		// If forceAllSettings, gather all syncable settings from localStorage
		if (forceAllSettings && browser) {
			// List of keys we sync (maintained here to avoid dependency issues)
			const syncableKeys = [
				// Core settings
				'fontSize',
				'storyCount',
				'categoryHeaderPosition',
				'storyExpandMode',
				'storyOpenMode',
				'useLatestUrls',
				'introShown',
				// Theme and language
				'theme',
				'kiteLanguage',
				'dataLanguage',
				// Categories
				'categoryOrder',
				'enabledCategories',
				'disabledCategories',
				// Content filter (complex with keywords, presets, mode, scope)
				'kite-content-filter',
				// Sections (full configuration including order and visibility)
				'kite-sections',
				// Experimental features (all 4 settings)
				'kite-experimental-features',
				// Preloading config (complex with multiple settings)
				'kite-preloading-config',
			];

			// Only send non-default values
			// The server should merge these with existing values, not replace everything
			for (const key of syncableKeys) {
				if (!processedKeys.has(key)) {
					const value = localStorage.getItem(key);
					if (value !== null) {
						// Parse JSON values if needed
						let parsedValue = value;
						try {
							// Try to parse as JSON if it looks like JSON
							if (value.startsWith('{') || value.startsWith('[')) {
								parsedValue = JSON.parse(value);
							}
						} catch {
							// Keep as string if not valid JSON
						}

						localSettings.push({
							key,
							value: parsedValue,
							version: 1,
							updatedAt: new Date(),
						});
					}
					// Don't send null for defaults - the server should keep existing values
				}
			}
		}

		console.log('[Sync] gatherLocalSettings - returning:', localSettings);
		return localSettings;
	}

	/**
	 * Process sync response from server
	 */
	private async processSyncResponse(data: SyncResponse) {
		const { settings: remoteSettings, conflicts } = data;

		console.log('[Sync] Processing sync response:', {
			settings: remoteSettings?.length || 0,
			conflicts: conflicts?.length || 0,
		});

		// Handle conflicts
		if (conflicts && conflicts.length > 0) {
			await this.handleConflicts(conflicts);
		}

		// Update local settings
		if (remoteSettings && remoteSettings.length > 0) {
			await this.updateLocalSettings(remoteSettings);
		}

		// Note: Read history is now synced separately via syncReadHistory()
	}

	/**
	 * Handle sync conflicts
	 */
	private async handleConflicts(conflicts: SyncConflict[]) {
		for (const conflict of conflicts) {
			console.warn('Sync conflict detected:', conflict);

			// Apply resolution based on strategy
			if (this.conflictResolutionStrategy === 'remote') {
				// Use remote version
				if (conflict.type === 'setting') {
					await this.updateLocalSettings([conflict.remote]);
				} else if (conflict.type === 'history') {
					// Read history is append-only, no real conflicts
					console.log('[Sync] History conflict resolved by keeping both');
				}
			} else if (this.conflictResolutionStrategy === 'local') {
				// Keep local version (do nothing)
			} else {
				// Merge strategy - use the resolution provided by server
				if (conflict.resolution) {
					if (conflict.type === 'setting') {
						await this.updateLocalSettings([conflict.resolution]);
					} else if (conflict.type === 'history') {
						// Read history is append-only, no real conflicts
						console.log('[Sync] History conflict resolved by keeping both');
					}
				}
			}
		}
	}

	/**
	 * Update local settings from remote
	 */
	private async updateLocalSettings(remoteSettings: RemoteSetting[]) {
		console.log('[Sync] Updating local settings from remote:', remoteSettings);

		// Create a set of all remote setting keys
		const _remoteSettingKeys = new Set(remoteSettings.map((s) => s.settingKey));

		// Get keys of settings we have pending changes for
		const pendingSettingKeys = new Set(
			this.pendingChanges
				.filter((change) => change.type === 'setting')
				.map((change) => change.data.key),
		);

		console.log('[Sync] Settings with pending changes:', Array.from(pendingSettingKeys));

		// First, process all remote settings (updates)
		for (const remoteSetting of remoteSettings) {
			const key = remoteSetting.settingKey;
			const value = remoteSetting.settingValue;

			// Skip if we have pending changes for this setting
			if (pendingSettingKeys.has(key)) {
				console.log(`[Sync] Skipping ${key} - we have pending local changes for this setting`);
				continue;
			}

			console.log(
				`[Sync] Processing remote setting ${key}:`,
				typeof value === 'object' ? JSON.stringify(value).substring(0, 200) : value,
			);

			if (value === null) {
				// Setting was deleted/reset to default on another device
				console.log(`[Sync] Removing setting ${key} (reset to default)`);
				safeRemoveItem(key);
			} else {
				// Update the setting
				console.log(`[Sync] Updating setting: ${key} =`, value);

				// Don't double-stringify - values from server are already properly formatted
				// Arrays and objects come as JSON strings, primitives come as strings
				if (typeof value === 'string') {
					safeSetItem(key, value);
				} else {
					// In case we get an object/array directly (shouldn't happen)
					safeSetItem(key, JSON.stringify(value));
				}

				// Update the reactive setting object if it exists
				// This ensures the UI updates when settings change from sync
				if (browser && typeof window !== 'undefined') {
					// Special handling for category settings
					if (
						key === 'categoryOrder' ||
						key === 'enabledCategories' ||
						key === 'disabledCategories'
					) {
						import('$lib/data/settings.svelte')
							.then(({ categorySettings }) => {
								if (categorySettings) {
									categorySettings.reload();
								}
							})
							.catch((err) => {
								console.warn(`[Sync] Could not update category settings:`, err);
							});
					} else if (key === 'kite-sections') {
						// Special handling for sections (includes order and visibility)
						console.log(`[Sync] Updating sections from sync, value:`, value);
						import('$lib/stores/sections.svelte')
							.then(({ sections }) => {
								if (sections) {
									console.log('[Sync] Calling sections.init() to reload from localStorage');
									sections.init();
								}
							})
							.catch((err) => {
								console.warn(`[Sync] Could not update sections:`, err);
							});
					} else if (key === 'kite-experimental-features') {
						// Special handling for experimental features
						console.log(`[Sync] Updating experimental features from sync`);
						import('$lib/stores/experimental.svelte')
							.then(({ experimental }) => {
								if (experimental) {
									experimental.init();
								}
							})
							.catch((err) => {
								console.warn(`[Sync] Could not update experimental features:`, err);
							});
					} else if (key === 'kite-content-filter') {
						// Special handling for content filter
						console.log(`[Sync] Updating content filter from sync`);
						import('$lib/stores/contentFilter.svelte')
							.then(({ contentFilter }) => {
								if (contentFilter) {
									// Reload from localStorage (which was just updated)
									contentFilter.init();
								}
							})
							.catch((err) => {
								console.warn(`[Sync] Could not update content filter:`, err);
							});
					} else if (key === 'kite-preloading-config') {
						// Special handling for preloading config
						console.log(`[Sync] Updating preloading config from sync`);
						import('$lib/stores/preloadingConfig.svelte')
							.then(({ preloadingConfig }) => {
								if (preloadingConfig) {
									// Reload from localStorage (which was just updated)
									preloadingConfig.loadFromStorage();
								}
							})
							.catch((err) => {
								console.warn(`[Sync] Could not update preloading config:`, err);
							});
					} else {
						// For other settings, update individually
						import('$lib/data/settings.svelte')
							.then(({ settings }) => {
								const setting = settings[key as keyof typeof settings];
								if (setting && 'load' in setting && typeof setting.load === 'function') {
									setting.load();
								}
							})
							.catch((err) => {
								console.warn(`[Sync] Could not update reactive setting for ${key}:`, err);
							});
					}
				}
			}
		}

		// Second, check for any local settings that aren't in remote (deletions)
		// Since we now get ALL settings from remote, any missing ones should be reset to default
		const _allSettingKeys = [
			'fontSize',
			'storyCount',
			'categoryHeaderPosition',
			'introShown',
			'storyExpandMode',
			'storyOpenMode',
			'useLatestUrls',
			'theme',
			'kiteLanguage',
			'dataLanguage',
			'categoryOrder',
			'enabledCategories',
			'disabledCategories',
			'kite-content-filter', // Complex content filter with keywords, presets, mode, scope
			'kite-sections',
			'kite-experimental-features',
			'kite-preloading-config', // Complex preloading configuration
		];

		// Don't reset settings that are missing from remote
		// Missing settings in the response mean "no change" not "reset to default"
		// Only explicit null values should reset to default
		//
		// This prevents the following issue:
		// 1. Client A has contentFilter='family'
		// 2. Client B has contentFilter='default' (not stored due to 'when_not_default')
		// 3. Client B syncs and doesn't send contentFilter
		// 4. Server keeps Client A's value and sends it to Client B
		// 5. Client B correctly receives 'family'

		// Settings will be picked up when stores re-init on next access
		console.log('[Sync] Settings updated successfully');
	}

	/**
	 * Stop periodic sync
	 */
	private stopPeriodicSync() {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}

	/**
	 * Cleanup on logout or page unload
	 */
	cleanup() {
		this.stopPeriodicSync();

		if (this.syncDebounceTimer) {
			clearTimeout(this.syncDebounceTimer);
		}

		// Save any pending changes
		if (this.pendingChanges.length > 0) {
			this.savePendingChanges();
		}
	}

	/**
	 * Get sync state for UI
	 */
	getSyncState() {
		return { ...this.syncState };
	}

	/**
	 * Subscribe to sync state changes
	 */
	onSyncStateChange(listener: (state: SyncState) => void) {
		this.syncStateListeners.push(listener);

		// Return unsubscribe function
		return () => {
			const index = this.syncStateListeners.indexOf(listener);
			if (index > -1) {
				this.syncStateListeners.splice(index, 1);
			}
		};
	}

	/**
	 * Force sync now
	 */
	async forceSyncNow() {
		return this.sync();
	}

	/**
	 * Track setting change for sync
	 */
	trackSettingChange(key: string, value: unknown) {
		if (!browser) return;

		console.log(
			`[Sync] trackSettingChange called for ${key}:`,
			typeof value === 'string' && value.length > 100 ? `${value.substring(0, 100)}...` : value,
		);

		// Remove any existing pending change for this key (deduplication)
		this.pendingChanges = this.pendingChanges.filter(
			(change) => !(change.type === 'setting' && change.data.key === key),
		);

		// Add the new change
		this.pendingChanges.push({
			type: 'setting',
			operation: 'update',
			data: { key, value },
			timestamp: new Date(),
		});

		// Save pending changes
		this.savePendingChanges();

		// Update pending count
		this.updateSyncState({ pendingChanges: this.pendingChanges.length });

		// Trigger debounced sync
		this.debouncedSync();
	}

	/**
	 * Track read history for sync - immediately syncs to server
	 */
	async trackReadHistory(entry: {
		clusterId: string;
		categoryId?: string;
		batchRunId: string;
		timestamp: Date;
		readDuration?: number;
		languageCode?: string;
		clientId?: string;
	}) {
		if (!browser || !this.userId) return;

		// Check if read history sync is enabled
		const syncReadHistory = this.getSyncSetting('syncReadHistory', true);
		if (!syncReadHistory) {
			console.log('[Sync] Skipping read history tracking - sync disabled');
			return;
		}

		// Create a unique client ID for deduplication if not provided
		const clientId =
			entry.clientId ||
			`${this.deviceId}_${entry.clusterId}_${entry.timestamp.toISOString()}_${Math.random().toString(36).substring(2, 11)}`;

		// Use change log for efficient sync
		try {
			const response = await fetch('/api/sync/read-history-changes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					deviceId: this.deviceId,
					operations: [
						{
							operation: 'add',
							clientId,
							clusterId: entry.clusterId,
							batchRunId: entry.batchRunId,
							categoryId: entry.categoryId,
							timestamp: entry.timestamp.toISOString(),
							readDuration: entry.readDuration,
							languageCode: entry.languageCode,
						},
					],
				}),
			});

			if (!response.ok) {
				console.error('[Sync] Failed to record read history change:', await response.text());
				// Store locally for retry later
				this.pendingChanges.push({
					type: 'read_history',
					operation: 'create',
					data: { ...entry, clientId },
					timestamp: new Date(),
				});
				this.savePendingChanges();
			}
		} catch (error) {
			console.error('[Sync] Failed to sync read history:', error);
			// Store locally for retry later
			this.pendingChanges.push({
				type: 'read_history',
				operation: 'create',
				data: { ...entry, clientId },
				timestamp: new Date(),
			});
			this.savePendingChanges();
		}

		// Don't sync full history here - that's unnecessary
		// We only need to sync full history on startup or when explicitly requested
	}

	/**
	 * Track deletion of read history entry
	 */
	async trackReadHistoryDeletion(entry: {
		clusterId: string;
		categoryId?: string;
		batchRunId: string;
	}) {
		if (!browser || !this.userId) return;

		// Check if read history sync is enabled
		const syncReadHistory = this.getSyncSetting('syncReadHistory', true);
		if (!syncReadHistory) {
			console.log('[Sync] Skipping read history deletion tracking - sync disabled');
			return;
		}

		// Generate a client ID for this deletion operation
		const clientId = `${this.deviceId}_delete_${entry.clusterId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

		try {
			// Use change log for deletion
			const response = await fetch('/api/sync/read-history-changes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					deviceId: this.deviceId,
					operations: [
						{
							operation: 'delete',
							clientId,
							clusterId: entry.clusterId,
							batchRunId: entry.batchRunId,
							categoryId: entry.categoryId,
							timestamp: new Date().toISOString(),
						},
					],
				}),
			});

			if (!response.ok && response.status !== 401) {
				console.warn('[Sync] Failed to record deletion in change log:', await response.text());
			}
		} catch (error) {
			console.warn('[Sync] Failed to sync deletion:', error);
		}
	}
	/**
	 * Sync read history - fetches the full state from server and updates local
	 */
	async syncReadHistory(): Promise<boolean> {
		if (!browser || !this.userId) return false;

		try {
			// Use change log for efficient incremental sync
			const lastSequenceKey = `lastReadHistorySequence_${this.userId}_${this.deviceId}`;
			const lastSequence = parseInt(localStorage.getItem(lastSequenceKey) || '0', 10);

			console.log('[Sync] Fetching read history changes since sequence:', lastSequence);

			// Fetch only changes since last sync
			const response = await fetch(
				`/api/sync/read-history-changes?deviceId=${this.deviceId}&lastSequence=${lastSequence}`,
				{
					method: 'GET',
					credentials: 'include',
				},
			);

			if (!response.ok) {
				console.error('[Sync] Failed to fetch read history changes:', await response.text());
				return false;
			}

			const result = await response.json();
			if (result.success && result.data?.changes) {
				// Apply incremental changes to local database
				await this.applyReadHistoryChanges(result.data.changes);

				// Update last synced sequence
				if (result.data.lastSequence > lastSequence) {
					localStorage.setItem(lastSequenceKey, result.data.lastSequence.toString());
					console.log('[Sync] Updated last sequence to:', result.data.lastSequence);
				}

				console.log('[Sync] Applied', result.data.changes.length, 'read history changes');

				// Process any pending local changes (that we made while offline)
				await this.processPendingReadHistory();

				return true;
			}
		} catch (error) {
			console.error('[Sync] Failed to sync read history:', error);
			return false;
		}

		return false;
	}

	/**
	 * Apply incremental read history changes from server
	 */
	private async applyReadHistoryChanges(changes: ReadHistoryChange[]): Promise<void> {
		if (!browser || changes.length === 0) return;

		console.log('[Sync] Applying', changes.length, 'changes to local database');

		// Ensure DB is open
		if (!db.isOpen()) {
			await db.open();
		}

		// Apply changes in sequence order
		for (const change of changes) {
			try {
				if (change.operation === 'add') {
					// Add to local database
					// Use the clusterId as the ID (UUID format)
					await db.readStories.put({
						id: change.clusterId,
						title: '', // We don't store title in change log, but it's not critical for sync
						timestamp: new Date(change.timestamp).getTime(),
						batchId: change.batchRunId,
						categoryUuid: change.categoryId, // UUID
					});
				} else if (change.operation === 'delete') {
					// Remove from local database
					await db.readStories.delete(change.clusterId);
				}
			} catch (error) {
				console.warn('[Sync] Failed to apply change:', change, error);
				// Continue with other changes even if one fails
			}
		}

		console.log('[Sync] Finished applying changes');

		// Notify the UI that read stories have been updated
		if (changes.length > 0) {
			console.log('[Sync] Dispatching sync-complete event');
			window.dispatchEvent(new CustomEvent('sync-complete'));
		}
	}

	/**
	 * Process pending read history changes (for retry after failures)
	 */
	private async processPendingReadHistory() {
		const pendingHistory = this.pendingChanges.filter((c) => c.type === 'read_history');

		if (pendingHistory.length === 0) return;

		// Bulk upload pending read history
		const entries = pendingHistory.map((change) => ({
			clientId:
				change.data.clientId ||
				`${this.deviceId}_${change.data.clusterId}_${change.timestamp.toISOString()}_${Math.random().toString(36).substring(2, 11)}`,
			clusterId: change.data.clusterId,
			categoryId: change.data.categoryId,
			batchRunId: change.data.batchRunId,
			timestamp: change.data.timestamp,
			readDuration: change.data.readDuration,
			languageCode: change.data.languageCode || 'en',
		}));

		try {
			const response = await fetch('/api/sync/read-history-bulk', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					deviceId: this.deviceId,
					entries,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				console.log(
					'[Sync] Uploaded pending read history:',
					result.uploaded,
					'uploaded,',
					result.skipped,
					'skipped',
				);

				// Remove successfully processed changes
				this.pendingChanges = this.pendingChanges.filter((c) => c.type !== 'read_history');
				this.savePendingChanges();

				// Update local state with full server state
				if (result.data?.entries) {
					await kiteDB.syncFromServer(result.data.entries);
				}
			}
		} catch (error) {
			console.error('[Sync] Failed to upload pending read history:', error);
		}
	}

	/**
	 * Perform initial bulk sync of all read stories from IndexedDB
	 */
	async performInitialBulkSync(): Promise<boolean> {
		if (!this.userId || this.userId === 'anonymous') return false;

		try {
			console.log('[Sync] Starting initial bulk sync of read stories');

			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			// Get all read story entries with their metadata
			const readStoryEntries = await db.readStories.toArray();

			if (readStoryEntries.length === 0) {
				console.log('[Sync] No read stories to sync');
				return true;
			}

			// Filter and map entries for syncing
			const entries = readStoryEntries
				.filter((entry) => {
					// Skip legacy entries
					if (entry.id.startsWith('legacy:')) return false;
					// Must have at least a batchId to be syncable
					return entry.batchId;
				})
				.map((entry) => ({
					// Always use UUID (we cleaned up the database)
					clusterId: entry.id,
					batchRunId: entry.batchId!,
					// Always use UUID
					categoryId: entry.categoryUuid || null,
					timestamp: new Date(entry.timestamp).toISOString(),
					readDuration: 0,
					languageCode: 'en',
					// For bulk sync, use deterministic clientId based on story+timestamp
					// This prevents duplicates when multiple devices sync the same story
					clientId: `bulk_${entry.id}_${entry.timestamp}`,
				}));

			if (entries.length === 0) {
				console.log(
					'[Sync] No valid entries to sync (only legacy entries without batch info found)',
				);
				// No local data to upload, but we should still fetch remote changes
				// Don't return here - continue to fetch remote changes below
			} else {
				console.log(`[Sync] Uploading ${entries.length} read stories in bulk`);

				// Upload in chunks of 1000 to avoid overwhelming the server
				const chunkSize = 1000;
				let totalAdded = 0;

				for (let i = 0; i < entries.length; i += chunkSize) {
					const chunk = entries.slice(i, i + chunkSize);

					const response = await fetch('/api/sync/read-history-bulk', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							deviceId: this.deviceId,
							entries: chunk,
						}),
					});

					if (!response.ok) {
						console.error(
							`[Sync] Failed to upload chunk ${i / chunkSize + 1}:`,
							await response.text(),
						);
						// Continue with other chunks even if one fails
					} else {
						const result = await response.json();
						totalAdded += result.added || 0;
						console.log(
							`[Sync] Uploaded chunk ${i / chunkSize + 1}, added ${result.added} entries`,
						);
					}
				}

				console.log(`[Sync] Initial bulk sync completed. Total added: ${totalAdded}`);
			}

			// Now fetch remote changes regardless of whether we had local data
			console.log('[Sync] Fetching remote read history changes...');
			const syncSuccess = await this.syncReadHistory();

			return syncSuccess;
		} catch (error) {
			console.error('[Sync] Initial bulk sync failed:', error);
			return false;
		}
	}

	/**
	 * Initialize sync manager with user ID from session
	 */
	async initialize(userId?: string) {
		if (!browser) return;

		// Set user ID and logged-in status
		this.userId = userId || `anon_${this.deviceId}`;
		this.isLoggedIn = !!userId; // Only logged in if we have a real userId

		// Load last sync time
		const lastSync = safeGetItem(`lastSync_${this.userId}`);
		if (lastSync) {
			this.updateSyncState({ lastSyncedAt: new Date(lastSync) });
		}

		// Clear old pending changes on startup - they're stale from previous session
		this.pendingChanges = [];
		this.savePendingChanges();

		// Start sync operations if we have a user ID
		if (userId) {
			// Check if initial bulk sync has been done for this user
			const initialSyncKey = `kite_initial_sync_complete_${userId}`;
			const initialSyncDone = localStorage.getItem(initialSyncKey) === 'true';

			if (!initialSyncDone) {
				// First time sync for this user - bulk upload all read stories if sync is enabled
				const syncReadHistory = this.getSyncSetting('syncReadHistory', true);
				if (syncReadHistory) {
					console.log('[Sync] Performing initial bulk sync of read history');
					const success = await this.performInitialBulkSync();
					if (success) {
						localStorage.setItem(initialSyncKey, 'true');
					}
				}
			} else {
				// Not first time, but still sync read history on startup if enabled
				const syncReadHistory = this.getSyncSetting('syncReadHistory', true);
				if (syncReadHistory) {
					await this.syncReadHistory();
				}
			}

			// Periodic sync disabled for now
			// this.startPeriodicSync();

			// Initial sync to get any remote changes (same as translate)
			await this.sync(false, true); // Don't force all settings, just pull remote changes
		}
	}

	/**
	 * Force sync with all local settings (for initial setup)
	 */
	async forceSyncAllSettings() {
		return this.sync(true);
	}

	/**
	 * Set conflict resolution strategy
	 */
	setConflictStrategy(strategy: 'local' | 'remote' | 'merge') {
		this.conflictResolutionStrategy = strategy;
	}

	/**
	 * Handle when read history sync is enabled
	 * This should fetch all remote data even if local is empty
	 */
	async onReadHistorySyncEnabled() {
		if (!this.userId || this.userId === 'anonymous') return;

		console.log('[Sync] Read history sync enabled, fetching remote data...');

		// Clear the last sequence to fetch everything from remote
		const lastSequenceKey = `lastReadHistorySequence_${this.userId}_${this.deviceId}`;
		localStorage.removeItem(lastSequenceKey);

		// Use performInitialBulkSync which handles both upload and download
		await this.performInitialBulkSync();
	}
}

// Create singleton instance
export const syncManager = new SyncManager();

// Auto-cleanup on page unload
if (browser) {
	window.addEventListener('beforeunload', () => {
		syncManager.cleanup();
	});
}
