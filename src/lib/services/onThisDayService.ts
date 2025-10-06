import type { LoadOnThisDayResponse, OnThisDayEvent } from '$lib/types';
import { batchService } from './batchService';

/**
 * Service for OnThisDay functionality
 */
class OnThisDayService {
	private baseUrl = '/api';

	/**
	 * Load OnThisDay events
	 */
	async loadOnThisDayEvents(language: string = 'default'): Promise<OnThisDayEvent[]> {
		try {
			// If we have a specific batch ID (time travel), use it
			// Otherwise, use the latest batch endpoint
			const currentBatchId = batchService.getCurrentBatchId();
			const endpoint = currentBatchId
				? `${this.baseUrl}/batches/${currentBatchId}/onthisday`
				: `${this.baseUrl}/batches/latest/onthisday?lang=${language}`;

			const response = await fetch(endpoint);
			if (!response.ok) {
				if (response.status === 404) {
					// OnThisDay data not available for this batch
					return [];
				}
				throw new Error(`Failed to load OnThisDay events: ${response.statusText}`);
			}
			const data: LoadOnThisDayResponse = await response.json();
			return data.events;
		} catch (error) {
			console.error('Error loading OnThisDay events:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const onThisDayService = new OnThisDayService();
