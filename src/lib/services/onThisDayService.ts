import type { OnThisDayEvent, LoadOnThisDayResponse } from "$lib/types";
import { batchService } from "./batchService";
import { getApiBaseUrl } from "$lib/utils/apiUrl";

/**
 * Service for OnThisDay functionality
 */
class OnThisDayService {

  /**
   * Load OnThisDay events
   */
  async loadOnThisDayEvents(language = "default"): Promise<OnThisDayEvent[]> {
    try {
      // If we have a specific batch ID (time travel), use it
      // Otherwise, use the latest batch endpoint
      const currentBatchId = batchService.getCurrentBatchId();
      const baseUrl = getApiBaseUrl();
      const endpoint = currentBatchId
        ? `${baseUrl}/batches/${currentBatchId}/onthisday`
        : `${baseUrl}/batches/latest/onthisday?lang=${language}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        if (response.status === 404) {
          // OnThisDay data not available for this batch
          return [];
        }
        throw new Error(
          `Failed to load OnThisDay events: ${response.statusText}`,
        );
      }
      const data: LoadOnThisDayResponse = await response.json();
      return data.events;
    } catch (error) {
      console.error("Error loading OnThisDay events:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const onThisDayService = new OnThisDayService();
