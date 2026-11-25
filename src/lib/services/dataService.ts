import { STORIES_PER_CATEGORY } from '$lib/constants/categories';
import { batchService } from './batchService';
import { chaosIndexService } from './chaosIndexService';
import { mediaService } from './mediaService';
import { onThisDayService } from './onThisDayService';
import { storiesService } from './storiesService';

// Global reload event handlers - use Sets to prevent duplicate registrations
const reloadCallbacks = new Set<() => Promise<void>>();
const beforeReloadCallbacks = new Set<() => void>();

// Single-flight reload: concurrent callers share the in-flight promise
// instead of starting duplicate reloads. This handles the case where
// DataLanguageSelector, sync-manager, and reactive effects all call
// reloadData() for the same logical event.
let inflightReload: Promise<void> | null = null;

export const dataReloadService = {
	// Register a callback to be called on reload
	// Returns an unsubscribe function for cleanup
	onReload(callback: () => Promise<void>): () => void {
		reloadCallbacks.add(callback);
		return () => {
			reloadCallbacks.delete(callback);
		};
	},

	// Register a callback to be called before reload starts
	// Returns an unsubscribe function for cleanup
	beforeReload(callback: () => void): () => void {
		beforeReloadCallbacks.add(callback);
		return () => {
			beforeReloadCallbacks.delete(callback);
		};
	},

	// Check if a reload is currently in progress
	isReloading(): boolean {
		return inflightReload !== null;
	},

	// Trigger all reload callbacks. If a reload is already in progress,
	// returns the existing promise (single-flight deduplication).
	async reloadData() {
		if (inflightReload) {
			return inflightReload;
		}

		const doReload = async () => {
			try {
				for (const cb of beforeReloadCallbacks) cb();
				await Promise.all([...reloadCallbacks].map((cb) => cb()));
			} finally {
				inflightReload = null;
			}
		};

		inflightReload = doReload();
		return inflightReload;
	},
};

/**
 * Main data service facade
 * Delegates to specialized services for different domains
 */
class DataService {
	/**
	 * Batch & Time Travel functionality
	 * @param batchId - The batch UUID to view
	 * @param batchCreatedAt - Batch creation timestamp
	 * @param batchDateSlug - Batch date slug (YYYY-MM-DD.N)
	 * @param isHistorical - True if this is a historical batch (time travel), false for latest
	 */
	setTimeTravelBatch(
		batchId: string | null,
		batchCreatedAt?: string | null,
		batchDateSlug?: string | null,
		isHistorical: boolean = false,
		entrySource?: 'url' | 'modal' | null,
	) {
		return batchService.setTimeTravelBatch(
			batchId,
			batchCreatedAt,
			batchDateSlug,
			isHistorical,
			entrySource,
		);
	}

	isTimeTravelMode(): boolean {
		return batchService.isTimeTravelMode();
	}

	/**
	 * Stories functionality
	 */
	async loadStories(
		batchId: string,
		categoryUuid: string,
		limit: number = STORIES_PER_CATEGORY,
		lang: string = 'default',
	) {
		return storiesService.loadStories(batchId, categoryUuid, limit, lang);
	}

	/**
	 * OnThisDay functionality
	 * Returns both events and the language that was actually used by the backend
	 */
	async loadOnThisDayEvents(language: string = 'default') {
		return onThisDayService.loadOnThisDayEvents(language);
	}

	/**
	 * Media/Source functionality
	 */
	async loadMediaData(language: string = 'default') {
		return mediaService.loadMediaData(language);
	}

	async getMediaInfoForDomain(domain: string, language: string = 'default') {
		return mediaService.getMediaInfoForDomain(domain, language);
	}

	async loadMediaDataForHost(host: string, language: string = 'default') {
		return mediaService.loadMediaDataForHost(host, language);
	}

	/**
	 * Chaos Index functionality
	 */
	async loadChaosIndex(language: string = 'default') {
		return chaosIndexService.loadChaosIndex(language);
	}

	async getChaosIndexHistory(language: string = 'default', days: number = 30) {
		return chaosIndexService.getChaosIndexHistory(language, days);
	}
}

// Export singleton instance
export const dataService = new DataService();
