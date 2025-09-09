import { timeTravelBatch } from "$lib/stores/timeTravelBatch.svelte";
import { getApiBaseUrl } from "$lib/utils/apiUrl";
import type { Category } from "$lib/types";

/**
 * Service for managing batch data and time travel functionality
 */
class BatchService {

  /**
   * Set a specific batch ID for time travel
   */
  setTimeTravelBatch(batchId: string | null) {
    timeTravelBatch.set(batchId);
    console.log(
      `⏰ Time travel mode ${batchId ? "enabled" : "disabled"}, batch: ${batchId}`,
    );
  }

  /**
   * Check if we're in time travel mode
   */
  isTimeTravelMode(): boolean {
    return timeTravelBatch.isTimeTravelMode();
  }

  /**
   * Get the current batch ID (for time travel)
   */
  getCurrentBatchId(): string | null {
    return timeTravelBatch.get();
  }

  /**
   * Load all data for initial page load
   */
  async loadInitialData(
    language = "default",
    providedBatchInfo?: {
      id: string;
      createdAt: string;
      totalReadCount?: number;
    },
  ): Promise<{
    batchId: string;
    batchCreatedAt?: string;
    categories: Category[];
    categoryMap: Record<string, string>;
    timestamp: number;
    hasOnThisDay: boolean;
    chaosIndex?: number;
    chaosDescription?: string;
    chaosLastUpdated?: string;
    totalReadCount: number;
  }> {
    try {
      let batchId: string;
      let batchCreatedAt: string;
      let totalReadCount = 0;

      // Step 1: Get the batch (either time travel or latest)
      const currentBatchId = this.getCurrentBatchId();

      // If we already have batch info provided, use it to avoid duplicate API call
      if (providedBatchInfo && providedBatchInfo.id === currentBatchId) {
        console.log("🚀 Using provided batch info, skipping API call");
        batchId = providedBatchInfo.id;
        batchCreatedAt = providedBatchInfo.createdAt;
        totalReadCount = providedBatchInfo.totalReadCount || 0;
      } else if (currentBatchId) {
        // Time travel mode - use specific batch
        const baseUrl = getApiBaseUrl();
        const batchResponse = await fetch(`${baseUrl}/batches/${currentBatchId}`);
        if (!batchResponse.ok) {
          throw new Error(
            `Failed to get batch ${currentBatchId}: ${batchResponse.statusText}`,
          );
        }
        const batch = await batchResponse.json();
        batchId = batch.id;
        batchCreatedAt = batch.createdAt;
        totalReadCount = batch.totalReadCount || 0;
      } else {
        // Live mode - get latest batch with basic retry/backoff on transient errors
        const baseUrl = getApiBaseUrl();
        const endpoint = `${baseUrl}/batches/latest?lang=${language}`;
        let lastError: unknown = null;
        let batch: { id: string; createdAt: string; totalReadCount?: number } | null = null;
        const maxAttempts = 3;
        const baseDelayMs = 300;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const res = await fetch(endpoint);
            if (res.ok) {
              batch = await res.json();
              break;
            }
            // Retry on 5xx only
            if (res.status >= 500 && res.status < 600) {
              lastError = new Error(`Failed to get latest batch: ${res.status} ${res.statusText}`);
            } else {
              throw new Error(`Failed to get latest batch: ${res.status} ${res.statusText}`);
            }
          } catch (e) {
            lastError = e;
          }
          // Exponential backoff with jitter
          const jitter = Math.floor(Math.random() * 100);
          const delay = baseDelayMs * (2 ** (attempt - 1)) + jitter;
          await new Promise((r) => setTimeout(r, delay));
        }
        if (!batch) {
          throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Unknown error'));
        }
        batchId = batch.id;
        batchCreatedAt = batch.createdAt;
        totalReadCount = batch.totalReadCount || 0;
      }

      // Step 2: Get categories for that batch with language parameter
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/batches/${batchId}/categories?lang=${language}`);
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.statusText}`);
      }
      type ApiCategory = {
        categoryId: string;
        id: string;
        categoryName: string;
      };
      const data: { categories: ApiCategory[]; hasOnThisDay?: boolean } =
        await response.json();

      // Create a mapping of categoryId to UUID
      const categoryMap: Record<string, string> = {};

      // Transform the response to match the expected Category interface
      const categories: Category[] = data.categories.map((cat) => {
        categoryMap[cat.categoryId] = cat.id; // Store the UUID mapping
        return {
          id: cat.categoryId,
          name: cat.categoryName,
        };
      });

      // Add OnThisDay as a special category if available
      if (data.hasOnThisDay) {
        categories.push({
          id: "onthisday",
          name: "On This Day",
        });
        // Note: OnThisDay doesn't need a UUID mapping as it uses a different endpoint
      }

      // Step 3: Load chaos index for this batch
      let chaosData = null;
      try {
        const baseUrl = getApiBaseUrl();
        const chaosResponse = await fetch(`${baseUrl}/batches/${batchId}/chaos?lang=${language}`);
        if (chaosResponse.ok) {
          chaosData = await chaosResponse.json();
        }
      } catch (error) {
        console.warn("Failed to load chaos index:", error);
        // Continue without chaos index
      }

      return {
        batchId,
        batchCreatedAt,
        categories,
        categoryMap,
        timestamp: new Date(batchCreatedAt).getTime() / 1000,
        hasOnThisDay: data.hasOnThisDay || false,
        chaosIndex: chaosData?.chaosIndex,
        chaosDescription: chaosData?.chaosDescription,
        chaosLastUpdated: chaosData?.chaosLastUpdated,
        totalReadCount,
      };
    } catch (error) {
      console.error("Error loading initial data:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const batchService = new BatchService();
