import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import type { BatchCategoriesResponse, Category } from '$lib/types';

/**
 * Service for managing batch data and time travel functionality
 */
class BatchService {
	private baseUrl = '/api';

	/**
	 * Set a specific batch ID for time travel
	 */
	setTimeTravelBatch(batchId: string | null) {
		timeTravelBatch.set(batchId);
		console.log(`⏰ Time travel mode ${batchId ? 'enabled' : 'disabled'}, batch: ${batchId}`);
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
		language: string = 'default',
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
			let totalReadCount: number = 0;

			// Step 1: Get the batch (either time travel or latest)
			const currentBatchId = this.getCurrentBatchId();

			// If we already have batch info provided, use it to avoid duplicate API call
			if (providedBatchInfo && providedBatchInfo.id === currentBatchId) {
				console.log('🚀 Using provided batch info, skipping API call');
				batchId = providedBatchInfo.id;
				batchCreatedAt = providedBatchInfo.createdAt;
				totalReadCount = providedBatchInfo.totalReadCount || 0;
			} else if (currentBatchId) {
				// Time travel mode - use specific batch
				const batchResponse = await fetch(`${this.baseUrl}/batches/${currentBatchId}`);
				if (!batchResponse.ok) {
					throw new Error(`Failed to get batch ${currentBatchId}: ${batchResponse.statusText}`);
				}
				const batch = await batchResponse.json();
				batchId = batch.id;
				batchCreatedAt = batch.createdAt;
				totalReadCount = batch.totalReadCount || 0;
			} else {
				// Live mode - get latest batch
				const batchResponse = await fetch(`${this.baseUrl}/batches/latest?lang=${language}`);
				if (!batchResponse.ok) {
					throw new Error(`Failed to get latest batch: ${batchResponse.statusText}`);
				}
				const batch = await batchResponse.json();
				batchId = batch.id;
				batchCreatedAt = batch.createdAt;
				totalReadCount = batch.totalReadCount || 0;
			}

			// Step 2: Get categories for that batch with language parameter
			const response = await fetch(
				`${this.baseUrl}/batches/${batchId}/categories?lang=${language}`,
			);
			if (!response.ok) {
				throw new Error(`Failed to load categories: ${response.statusText}`);
			}
			const data = (await response.json()) as BatchCategoriesResponse;
			console.log('📊 Categories API response:', data);

			// Create a mapping of categoryId to UUID
			const categoryMap: Record<string, string> = {};

			// Transform the response to match the expected Category interface
			const categories: Category[] = (data.categories || []).map((cat) => {
				categoryMap[cat.categoryId] = cat.id; // Store the UUID mapping
				return {
					id: cat.categoryId,
					name: cat.categoryName,
				};
			});

			console.log('📊 Transformed categories:', categories.length, 'categories');

			// Add OnThisDay as a special category if available
			if (data.hasOnThisDay) {
				categories.push({
					id: 'onthisday',
					name: 'On This Day',
				});
				// Note: OnThisDay doesn't need a UUID mapping as it uses a different endpoint
			}

			// Step 3: Load chaos index for this batch
			let chaosData = null;
			try {
				const chaosResponse = await fetch(
					`${this.baseUrl}/batches/${batchId}/chaos?lang=${language}`,
				);
				if (chaosResponse.ok) {
					chaosData = await chaosResponse.json();
				}
			} catch (error) {
				console.warn('Failed to load chaos index:', error);
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
			console.error('Error loading initial data:', error);
			throw error;
		}
	}
}

// Export singleton instance
export const batchService = new BatchService();
