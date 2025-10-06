import type { LoadMediaDataResponse, MediaInfo } from '$lib/types';

/**
 * Service for media/source information
 */
class MediaService {
	private baseUrl = '/api';

	/**
	 * Load media data for source information
	 */
	async loadMediaData(language: string = 'default'): Promise<MediaInfo[]> {
		try {
			const response = await fetch(`${this.baseUrl}/media?lang=${language}`);
			if (!response.ok) {
				throw new Error(`Failed to load media data: ${response.statusText}`);
			}
			const data: LoadMediaDataResponse = await response.json();
			return data.mediaData;
		} catch (error) {
			console.error('Error loading media data:', error);
			throw error;
		}
	}

	/**
	 * Get media info for a specific domain
	 */
	async getMediaInfoForDomain(
		domain: string,
		language: string = 'default',
	): Promise<MediaInfo | null> {
		try {
			const mediaData = await this.loadMediaData(language);
			return mediaData.find((info) => info.domains.includes(domain)) || null;
		} catch (error) {
			console.error('Error getting media info for domain:', error);
			return null;
		}
	}

	/**
	 * Load media data for a specific host (optimized endpoint)
	 */
	async loadMediaDataForHost(
		host: string,
		language: string = 'default',
	): Promise<MediaInfo | null> {
		try {
			const response = await fetch(`${this.baseUrl}/media/${host}?lang=${language}`);
			if (!response.ok) {
				if (response.status === 404) {
					return null; // No media info found for this host
				}
				throw new Error(`Failed to load media data for host: ${response.statusText}`);
			}
			const data = await response.json();
			return data.mediaInfo;
		} catch (error) {
			console.error('Error loading media data for host:', error);
			return null;
		}
	}
}

// Export singleton instance
export const mediaService = new MediaService();
