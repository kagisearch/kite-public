/**
 * Type definitions for sync functionality
 * Used by sync-manager and sync-related API endpoints
 */

/**
 * Current state of the sync manager
 */
export interface SyncState {
	isSyncing: boolean;
	lastSyncedAt: Date | null;
	pendingChanges: number;
	syncError: string | null;
	isOnline: boolean;
}

/**
 * Data for a setting change
 */
export interface SettingChangeData {
	key: string;
	value: unknown;
}

/**
 * Data for a read history change
 */
export interface ReadHistoryChangeData {
	clusterId: string;
	categoryId?: string;
	batchRunId: string;
	timestamp: Date | string;
	readDuration?: number;
	languageCode?: string;
	clientId?: string;
}

/**
 * Union type for all possible change data
 */
export type LocalChangeData = SettingChangeData | ReadHistoryChangeData;

/**
 * A local change pending sync
 */
export interface LocalChange {
	type: 'setting' | 'read_history';
	operation: 'create' | 'update' | 'delete';
	data: LocalChangeData;
	timestamp: Date;
}

/**
 * A setting from the remote server
 */
export interface RemoteSetting {
	settingKey: string;
	settingValue: string | null;
	version?: number;
	updatedAt?: string;
}

/**
 * A sync conflict between local and remote
 */
export interface SyncConflict {
	type: 'setting' | 'history';
	remote?: RemoteSetting;
	resolution?: RemoteSetting;
}

/**
 * Response from sync API endpoint
 */
export interface SyncResponse {
	settings?: RemoteSetting[];
	conflicts?: SyncConflict[];
	syncedAt: string;
}

/**
 * A read history change from the server
 */
export interface ReadHistoryChange {
	operation: 'add' | 'delete';
	clusterId: string;
	batchRunId: string;
	categoryId?: string;
	timestamp: string;
	sequence?: number;
	clientId?: string;
}
