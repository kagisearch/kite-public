import { batchService } from "./batchService";
import { chaosIndexService } from "./chaosIndexService";
import { mediaService } from "./mediaService";
import { onThisDayService } from "./onThisDayService";
import { storiesService } from "./storiesService";

// Global reload event handlers
const reloadCallbacks: Array<() => Promise<void>> = [];

export const dataReloadService = {
  // Register a callback to be called on reload
  onReload(callback: () => Promise<void>) {
    reloadCallbacks.push(callback);
    console.log("🔧 Reload callback registered");
  },

  // Trigger all reload callbacks
  async reloadData() {
    console.log("🔄 Reloading data...");
    // Call all registered callbacks
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
    language = "default",
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
    limit = 12,
    language = "default",
  ) {
    return storiesService.loadStories(batchId, categoryUuid, limit, language);
  }

  /**
   * OnThisDay functionality
   */
  async loadOnThisDayEvents(language = "default") {
    return onThisDayService.loadOnThisDayEvents(language);
  }

  /**
   * Media/Source functionality
   */
  async loadMediaData(language = "default") {
    return mediaService.loadMediaData(language);
  }

  async getMediaInfoForDomain(domain: string, language = "default") {
    return mediaService.getMediaInfoForDomain(domain, language);
  }

  async loadMediaDataForHost(host: string, language = "default") {
    return mediaService.loadMediaDataForHost(host, language);
  }

  /**
   * Chaos Index functionality
   */
  async loadChaosIndex(language = "default") {
    return chaosIndexService.loadChaosIndex(language);
  }

  async getChaosIndexHistory(language = "default", days = 30) {
    return chaosIndexService.getChaosIndexHistory(language, days);
  }
}

// Export singleton instance
export const dataService = new DataService();
