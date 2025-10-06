import { batchService } from './batchService';
import { chaosIndexService } from './chaosIndexService';
import { mediaService } from './mediaService';
import { onThisDayService } from './onThisDayService';
import { storiesService } from './storiesService';

// Global reload event handlers
const reloadCallbacks: (() => Promise<void>)[] = [];
const beforeReloadCallbacks: (() => void)[] = [];

export const dataReloadService = {
	// Register a callback to be called on reload
	onReload(callback: () => Promise<void>) {
		reloadCallbacks.push(callback);
		console.log('🔧 Reload callback registered');
	},

	// Register a callback to be called before reload starts
	beforeReload(callback: () => void) {
		beforeReloadCallbacks.push(callback);
		console.log('🔧 Before-reload callback registered');
	},

	// Trigger all reload callbacks
	async reloadData() {
		console.log('🔄 Reloading data...');
		// Call before-reload callbacks first (synchronously)
		beforeReloadCallbacks.forEach((cb) => {
			cb();
		});
		// Then call all registered reload callbacks
		await Promise.all(reloadCallbacks.map((cb) => cb()));
	},
};

/**
 * Main data service facade
 * Delegates to specialized services for different domains
 */
class DataService {
	/**
	 * Batch & Time Travel functionality
	 */
	setTimeTravelBatch(batchId: string | null) {
		return batchService.setTimeTravelBatch(batchId);
	}

	isTimeTravelMode(): boolean {
		return batchService.isTimeTravelMode();
	}

	async loadInitialData(
		language: string = 'default',
		providedBatchInfo?: { id: string; createdAt: string },
	) {
		return batchService.loadInitialData(language, providedBatchInfo);
	}

	/**
	 * Stories functionality
	 */
	async loadStories(
		batchId: string,
		categoryUuid: string,
		limit: number = 12,
		language: string = 'default',
	) {
		return storiesService.loadStories(batchId, categoryUuid, limit, language);
	}

	/**
	 * OnThisDay functionality
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
