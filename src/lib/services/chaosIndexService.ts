import { batchService } from './batchService';

/**
 * Service for Chaos Index functionality
 */
class ChaosIndexService {
	private baseUrl = '/api';

	/**
	 * Load chaos index data
	 */
	async loadChaosIndex(language: string = 'default'): Promise<{
		chaosIndex: number;
		chaosDescription: string;
		chaosLastUpdated: string | null;
	} | null> {
		try {
			const currentBatchId = batchService.getCurrentBatchId();
			const endpoint = currentBatchId
				? `${this.baseUrl}/batches/${currentBatchId}/chaos?lang=${language}`
				: `${this.baseUrl}/batches/latest/chaos?lang=${language}`;

			const response = await fetch(endpoint);
			if (!response.ok) {
				if (response.status === 404) {
					// Chaos index not available
					return null;
				}
				throw new Error(`Failed to load chaos index: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Error loading chaos index:', error);
			throw error;
		}
	}

	/**
	 * Get historical chaos index data
	 */
	async getChaosIndexHistory(
		language: string = 'default',
		days: number = 30,
	): Promise<Array<{ date: string; score: number; summary: string }>> {
		try {
			const response = await fetch(`${this.baseUrl}/chaos/history?lang=${language}&days=${days}`);

			if (!response.ok) {
				throw new Error(`Failed to fetch chaos history: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Error fetching chaos history:', error);
			return [];
		}
	}
}

// Export singleton instance
export const chaosIndexService = new ChaosIndexService();
