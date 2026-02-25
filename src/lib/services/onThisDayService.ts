import type { LoadOnThisDayResponse, OnThisDayEvent } from '$lib/types';
import { batchService } from './batchService';

/**
 * Service for OnThisDay functionality
 */
class OnThisDayService {
	private baseUrl = '/api';

	/**
	 * Load OnThisDay events
	 * Sends the full language preference list - backend will try each in order
	 * and return the first available translation.
	 * Always includes English as a fallback.
	 * Returns both events and the language that was actually used.
	 */
	async loadOnThisDayEvents(language: string = 'default'): Promise<{
		events: OnThisDayEvent[];
		language: string;
	}> {
		try {
			// If we have a specific batch ID (time travel), use it
			// Otherwise, use the latest batch endpoint
			const currentBatchId = batchService.getCurrentBatchId();

			// Ensure English is always included as fallback (if not already present)
			const langWithFallback =
				language === 'default' || language.includes('en') ? language : `${language},en`;

			const endpoint = currentBatchId
				? `${this.baseUrl}/batches/${currentBatchId}/onthisday?lang=${langWithFallback}`
				: `${this.baseUrl}/batches/latest/onthisday?lang=${langWithFallback}`;

			const response = await fetch(endpoint);
			if (!response.ok) {
				if (response.status === 404) {
					// OnThisDay data not available for this batch
					return { events: [], language: 'en' };
				}
				throw new Error(`Failed to load OnThisDay events: ${response.statusText}`);
			}
			const data: LoadOnThisDayResponse = await response.json();
			return {
				events: data.events,
				language: data.language || 'en',
			};
		} catch (error) {
			console.error('Error loading OnThisDay events:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const onThisDayService = new OnThisDayService();
