import type { MediaInfo, LoadMediaDataResponse } from "$lib/types";
import { getApiBaseUrl } from "$lib/utils/apiUrl";

/**
 * Service for media/source information
 */
class MediaService {

  /**
   * Load media data for source information
   */
  async loadMediaData(language = "default"): Promise<MediaInfo[]> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/media?lang=${language}`);
      if (!response.ok) {
        throw new Error(`Failed to load media data: ${response.statusText}`);
      }
      const data: LoadMediaDataResponse = await response.json();
      return data.mediaData;
    } catch (error) {
      console.error("Error loading media data:", error);
      throw error;
    }
  }

  /**
   * Get media info for a specific domain
   */
  async getMediaInfoForDomain(
    domain: string,
    language = "default",
  ): Promise<MediaInfo | null> {
    try {
      const mediaData = await this.loadMediaData(language);
      return mediaData.find((info) => info.domains.includes(domain)) || null;
    } catch (error) {
      console.error("Error getting media info for domain:", error);
      return null;
    }
  }

  /**
   * Load media data for a specific host (optimized endpoint)
   */
  async loadMediaDataForHost(
    host: string,
    language = "default",
  ): Promise<MediaInfo | null> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/media/${host}?lang=${language}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No media info found for this host
        }
        throw new Error(
          `Failed to load media data for host: ${response.statusText}`,
        );
      }
      const data = await response.json();
      return data.mediaInfo;
    } catch (error) {
      console.error("Error loading media data for host:", error);
      return null;
    }
  }
}

// Export singleton instance
export const mediaService = new MediaService();
