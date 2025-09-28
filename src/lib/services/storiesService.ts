import type { Story } from "$lib/types";
import { getApiBaseUrl } from "$lib/utils/apiUrl";

/**
 * Service for loading story data
 */
class StoriesService {

  /**
   * Load stories for a specific category from a batch
   */
  async loadStories(
    batchId: string,
    categoryUuid: string,
    limit = 12, // Max 12 stories per category from UI
    language = "default",
  ): Promise<{ stories: Story[]; readCount: number; timestamp: number }> {
    try {
      // Load stories for this category with language parameter
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/batches/${batchId}/categories/${categoryUuid}/stories?limit=${limit}&lang=${language}`);
      if (!response.ok) {
        throw new Error(`Failed to load stories: ${response.statusText}`);
      }
      const data = await response.json();

      return {
        stories: data.stories,
        readCount: data.readCount,
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.error("Error loading stories:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const storiesService = new StoriesService();
