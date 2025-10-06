/**
 * Dexie-based database for Kite News
 * Manages read stories and other client-side data in IndexedDB
 *
 * Migration Strategy:
 * - Legacy stories from localStorage are stored with "legacy:title" IDs
 * - New stories use "batchId:categoryId:clusterNumber" format
 * - When a legacy story is marked as read again with full metadata,
 *   it's automatically migrated to the new format
 *
 * IndexedDB Storage Limits:
 * - Chrome/Edge: Up to 80% of disk space (but at least 1GB)
 * - Firefox: Up to 50% of disk space (but at least 10MB)
 * - Safari: Up to 1GB
 * - Can easily handle millions of read story entries
 */

import Dexie, { type Table } from 'dexie';
import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';

// Interface for read story entries
export interface ReadStoryEntry {
	id: string; // The cluster UUID (only format supported)
	title: string; // Story title for reference
	timestamp: number; // When the story was read
	batchId?: string; // Which batch the story belongs to
	categoryUuid?: string; // The UUID of the category
}

class KiteNewsDB extends Dexie {
	// Declare tables
	readStories!: Table<ReadStoryEntry>;

	constructor() {
		super('KiteNewsDB');

		// Define schema - Version 1
		this.version(1).stores({
			// Primary key is 'id', other fields are indexed for querying
			// Compound index [batchId+categoryId+clusterNumber] for efficient batch queries
			readStories: 'id, timestamp, [batchId+categoryId+clusterNumber], [batchId+categoryId]',
		});
	}
}

// Check if IndexedDB is available
let indexedDBAvailable = false;

// Synchronous check for IndexedDB availability
function checkIndexedDBSync(): boolean {
	if (!browser) return false;

	try {
		// Check if indexedDB exists
		if (typeof indexedDB !== 'undefined' && indexedDB !== null) {
			return true;
		}
	} catch (error) {
		console.warn('[Dexie] IndexedDB check failed:', error);
	}
	return false;
}

// Initial sync check
indexedDBAvailable = checkIndexedDBSync();

// Create database instance
const db = new KiteNewsDB();

// Open the database and log status
if (browser && indexedDBAvailable) {
	db.open()
		.then(() => {
			console.log('[Dexie] Database opened successfully');
		})
		.catch((error) => {
			console.error('[Dexie] Failed to open database:', error);
			indexedDBAvailable = false;
		});
}

/**
 * Database operations wrapper
 */
export const kiteDB = {
	/**
	 * Check if IndexedDB is available
	 */
	isAvailable(): boolean {
		return indexedDBAvailable;
	},

	/**
	 * Clean up all legacy data - we only support UUIDs now
	 */
	async cleanupLegacyData(): Promise<boolean> {
		if (!browser) return false;

		try {
			// Clean up ALL legacy localStorage entries
			const keysToRemove = [
				'readStories', // Legacy read stories
				'read_articles', // Old sync format
				'readArticles', // Another old format
				'dexie_migration_complete', // Old migration flag
			];

			keysToRemove.forEach((key) => {
				if (localStorage.getItem(key)) {
					console.log(`[Dexie] Removing legacy localStorage key: ${key}`);
					localStorage.removeItem(key);
				}
			});

			if (!indexedDBAvailable) return true;

			// Check if cleanup already done
			const cleanupDone = localStorage.getItem('dexie_cleanup_uuid_only_v1');
			if (cleanupDone === 'true') {
				return true;
			}

			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			// Get all existing entries
			const allEntries = await db.readStories.toArray();

			if (allEntries.length > 0) {
				console.log(`[Dexie] Checking ${allEntries.length} entries for cleanup`);

				// Delete all non-UUID entries
				const toDelete: string[] = [];
				const toKeep: ReadStoryEntry[] = [];

				for (const entry of allEntries) {
					// Check if ID is a valid UUID (simple check)
					const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
						entry.id,
					);

					if (!isUUID) {
						// Not a UUID - delete it (legacy or composite ID)
						toDelete.push(entry.id);
					} else {
						// Valid UUID - keep it
						// Legacy entries might have categoryId instead of categoryUuid
						const legacyEntry = entry as ReadStoryEntry & { categoryId?: string };
						toKeep.push({
							id: entry.id,
							title: entry.title,
							timestamp: entry.timestamp,
							batchId: entry.batchId,
							categoryUuid: entry.categoryUuid || legacyEntry.categoryId,
						});
					}
				}

				// Apply changes in a transaction
				await db.transaction('rw', db.readStories, async () => {
					// Delete old entries
					if (toDelete.length > 0) {
						console.log(`[Dexie] Deleting ${toDelete.length} non-UUID entries`);
						await db.readStories.bulkDelete(toDelete);
					}

					// Re-add cleaned entries
					if (toKeep.length > 0) {
						console.log(`[Dexie] Keeping ${toKeep.length} UUID entries`);
						await db.readStories.bulkPut(toKeep);
					}
				});

				console.log(`[Dexie] Cleanup complete: deleted ${toDelete.length}, kept ${toKeep.length}`);
			}

			// Mark cleanup as complete
			localStorage.setItem('dexie_cleanup_uuid_only_v1', 'true');

			return true;
		} catch (error) {
			console.error('[Dexie] Cleanup failed:', error);
			return false;
		}
	},

	/**
	 * Get all read stories as a Set of story IDs for optimal performance
	 */
	async getReadStoryIds(): Promise<Set<string>> {
		if (!browser || !indexedDBAvailable) {
			// No localStorage fallback - we only support IndexedDB with UUIDs
			return new Set();
		}

		try {
			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			const entries = await db.readStories.toArray();
			const storyIds = entries.map((entry) => entry.id).filter(Boolean);
			return new Set(storyIds);
		} catch (error) {
			console.error('[Dexie] Failed to get read stories:', error);
			return new Set();
		}
	},

	/**
	 * Check if a story has been read (by UUID)
	 */
	async isStoryRead(clusterUuid: string): Promise<boolean> {
		if (!browser || !indexedDBAvailable) {
			return false;
		}

		try {
			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			// Simply check if the UUID exists
			const hasStory = !!(await db.readStories.get(clusterUuid));
			return hasStory;
		} catch (error) {
			console.error('[Dexie] Failed to check if story is read:', error);
			return false;
		}
	},

	/**
	 * Unmark a story as read (remove from database)
	 */
	async unmarkStoryAsRead(
		clusterUuid: string,
		batchId?: string,
		categoryUuid?: string,
	): Promise<boolean> {
		if (!browser || !indexedDBAvailable) {
			return false;
		}

		try {
			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			// Simply delete by UUID
			await db.readStories.delete(clusterUuid);

			// Sync deletion to server if we have batch info
			// Uses syncManager which checks if user is logged in
			if (batchId && syncManager) {
				await syncManager.trackReadHistoryDeletion({
					clusterId: clusterUuid,
					batchRunId: batchId,
					categoryId: categoryUuid,
				});
			}

			return true;
		} catch (error) {
			console.error('[Dexie] Failed to unmark story as read:', error);
			return false;
		}
	},

	/**
	 * Mark a story as read (UUID only)
	 */
	async markStoryAsRead(
		clusterUuid: string,
		title: string,
		batchId?: string,
		categoryUuid?: string,
	): Promise<boolean> {
		if (!browser || !indexedDBAvailable) {
			return false;
		}

		try {
			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			// Check if already exists
			const existing = await db.readStories.get(clusterUuid);
			if (!existing) {
				// Add new entry with UUID as ID
				await db.readStories.add({
					id: clusterUuid,
					title,
					timestamp: Date.now(),
					batchId,
					categoryUuid,
				});

				// Track for sync if we have batch ID
				if (batchId && categoryUuid) {
					const now = Date.now();
					const clientId = `${clusterUuid}_${now}`;
					await syncManager.trackReadHistory({
						clusterId: clusterUuid,
						categoryId: categoryUuid,
						batchRunId: batchId,
						timestamp: new Date(now),
						readDuration: 0,
						languageCode: 'en',
						clientId,
					});
				}
			}

			return true;
		} catch (error) {
			console.error('[Dexie] Failed to mark story as read:', error);
			return false;
		}
	},

	/**
	 * Bulk update read stories
	 */
	async bulkUpdateReadStories(readStories: Record<string, boolean>): Promise<boolean> {
		if (!browser || !indexedDBAvailable) {
			// Fallback to localStorage
			try {
				// For localStorage fallback, apply reasonable limit to avoid quota issues
				const entries = Object.entries(readStories);
				if (entries.length > 2000) {
					const trimmed = Object.fromEntries(entries.slice(-1000));
					localStorage.setItem('readStories', JSON.stringify(trimmed));
				} else {
					localStorage.setItem('readStories', JSON.stringify(readStories));
				}
				return true;
			} catch {
				return false;
			}
		}

		try {
			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			// Clear existing and add new
			await db.transaction('rw', db.readStories, async () => {
				await db.readStories.clear();

				const entries: ReadStoryEntry[] = Object.entries(readStories)
					.filter(([_, read]) => read === true)
					.map(([title, _]) => ({
						id: title, // Use title as fallback ID for bulk migration
						title,
						timestamp: Date.now(),
					}));

				if (entries.length > 0) {
					await db.readStories.bulkAdd(entries);
				}
			});

			return true;
		} catch (error) {
			console.error('[Dexie] Failed to bulk update read stories:', error);
			return false;
		}
	},

	/**
	 * Clear all read stories
	 */
	async clearReadStories(): Promise<boolean> {
		if (!browser || !indexedDBAvailable) {
			localStorage.removeItem('readStories');
			return true;
		}

		try {
			await db.readStories.clear();
			return true;
		} catch (error) {
			console.error('[Dexie] Failed to clear read stories:', error);
			return false;
		}
	},

	/**
	 * Get count of read stories
	 */
	async getReadStoriesCount(): Promise<number> {
		if (!browser || !indexedDBAvailable) {
			return 0;
		}

		try {
			return await db.readStories.count();
		} catch (error) {
			console.error('[Dexie] Failed to get read stories count:', error);
			return 0;
		}
	},

	/**
	 * Get storage statistics
	 */
	async getStorageStats(): Promise<{
		count: number;
		estimatedSize?: number;
	} | null> {
		if (!browser || !indexedDBAvailable) return null;

		try {
			const count = await db.readStories.count();

			// Try to estimate storage if API is available
			let estimatedSize: number | undefined;
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				estimatedSize = estimate.usage;
			}

			return { count, estimatedSize };
		} catch (error) {
			console.error('[Dexie] Failed to get storage stats:', error);
			return null;
		}
	},

	/**
	 * Sync read stories from server
	 * Called when receiving synced data from other devices
	 */
	async syncFromServer(
		readHistory: Array<{
			clusterId: string;
			batchRunId: string;
			categoryId?: string;
			timestamp: Date | string;
			clientId: string;
		}>,
	): Promise<void> {
		if (!browser || !indexedDBAvailable || !readHistory.length) return;

		try {
			// Ensure DB is open
			if (!db.isOpen()) {
				await db.open();
			}

			// Get existing story IDs to avoid duplicates
			const existingStories = await db.readStories.toArray();
			const existingIds = new Set(existingStories.map((s) => s.id));

			// Add new stories that don't exist locally
			const toAdd: ReadStoryEntry[] = [];

			for (const entry of readHistory) {
				// Use clusterId as the storyId
				const storyId = entry.clusterId;

				// Skip if we already have this story ID
				// The storyId format already ensures uniqueness per batch/category/cluster
				if (existingIds.has(storyId)) {
					continue;
				}

				toAdd.push({
					id: storyId,
					title: `Synced story from ${entry.batchRunId}`, // We don't have title from sync
					timestamp: new Date(entry.timestamp).getTime(),
					batchId: entry.batchRunId,
					categoryUuid: entry.categoryId,
				});
			}

			if (toAdd.length > 0) {
				console.log(`[Dexie] Syncing ${toAdd.length} read stories from server`);
				await db.readStories.bulkAdd(toAdd);
			}
		} catch (error) {
			console.error('[Dexie] Failed to sync stories from server:', error);
		}
	},
};

// Export the database instance for direct access if needed
export { db };

// Debug helpers for console
if (browser && typeof window !== 'undefined') {
	// @ts-expect-error
	window.kiteDB = kiteDB;

	// @ts-expect-error
	window.debugKiteDB = async () => {
		try {
			console.log('[Dexie Debug] Database state:', db.isOpen());
			const count = await db.readStories.count();
			console.log('[Dexie Debug] Total read stories:', count);
			const stories = await db.readStories.limit(10).toArray();
			console.log('[Dexie Debug] Sample stories:', stories);

			// Check storage quota
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				console.log('[Dexie Debug] Storage estimate:', {
					quota: estimate.quota ? `${(estimate.quota / 1024 / 1024).toFixed(1)}MB` : 'Unknown',
					usage: estimate.usage ? `${(estimate.usage / 1024 / 1024).toFixed(1)}MB` : 'Unknown',
					usagePercentage:
						estimate.quota && estimate.usage
							? `${((estimate.usage / estimate.quota) * 100).toFixed(1)}%`
							: 'Unknown',
				});
			}

			return { count, stories };
		} catch (error) {
			console.error('[Dexie Debug] Error:', error);
			return { error: error instanceof Error ? error.message : String(error) };
		}
	};
}
