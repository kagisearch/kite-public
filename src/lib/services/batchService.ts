import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';

/**
 * Service for managing batch data and time travel functionality
 */
class BatchService {
	/**
	 * Set a specific batch ID for time travel
	 * @param batchId - The batch UUID to view
	 * @param batchCreatedAt - Batch creation timestamp
	 * @param batchDateSlug - Batch date slug (YYYY-MM-DD.N)
	 * @param isHistorical - True if this is a historical batch (time travel), false for latest
	 */
	setTimeTravelBatch(
		batchId: string | null,
		batchCreatedAt?: string | null,
		batchDateSlug?: string | null,
		isHistorical: boolean = false,
		entrySource?: 'url' | 'modal' | null,
	) {
		timeTravelBatch.set(batchId, batchCreatedAt, batchDateSlug, isHistorical, entrySource);
		console.log(
			`⏰ Time travel mode ${isHistorical ? 'enabled' : 'disabled'}, batch: ${batchId}, dateSlug: ${batchDateSlug}`,
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
}

// Export singleton instance
export const batchService = new BatchService();
