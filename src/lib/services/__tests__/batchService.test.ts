import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchService } from '../batchService';

// Mock fetch
global.fetch = vi.fn();

describe('BatchService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the service state
		batchService.setTimeTravelBatch(null);
	});

	describe('time travel functionality', () => {
		it('should set and check time travel mode', () => {
			expect(batchService.isTimeTravelMode()).toBe(false);

			batchService.setTimeTravelBatch('batch-123');
			expect(batchService.isTimeTravelMode()).toBe(true);
			expect(batchService.getCurrentBatchId()).toBe('batch-123');

			batchService.setTimeTravelBatch(null);
			expect(batchService.isTimeTravelMode()).toBe(false);
			expect(batchService.getCurrentBatchId()).toBe(null);
		});
	});

	describe('loadInitialData', () => {
		it('should load latest batch when not in time travel mode', async () => {
			const mockBatchResponse = {
				id: 'latest-batch',
				createdAt: '2024-01-01T12:00:00Z',
			};

			const mockCategoriesResponse = {
				categories: [
					{ id: 'cat-1', categoryId: 'world', categoryName: 'World' },
					{ id: 'cat-2', categoryId: 'tech', categoryName: 'Technology' },
				],
				hasOnThisDay: true,
			};

			const mockChaosResponse = {
				chaosIndex: 42,
				chaosDescription: 'Moderate turbulence',
				chaosLastUpdated: '2024-01-01T12:00:00Z',
			};

			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockBatchResponse,
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockCategoriesResponse,
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockChaosResponse,
				} as Response);

			const result = await batchService.loadInitialData('en');

			expect(fetch).toHaveBeenNthCalledWith(1, '/api/batches/latest?lang=en');
			expect(fetch).toHaveBeenNthCalledWith(2, '/api/batches/latest-batch/categories?lang=en');
			expect(fetch).toHaveBeenNthCalledWith(3, '/api/batches/latest-batch/chaos?lang=en');

			expect(result).toEqual({
				batchId: 'latest-batch',
				categories: [
					{ id: 'world', name: 'World' },
					{ id: 'tech', name: 'Technology' },
					{ id: 'onthisday', name: 'On This Day' },
				],
				categoryMap: {
					world: 'cat-1',
					tech: 'cat-2',
				},
				timestamp: new Date('2024-01-01T12:00:00Z').getTime() / 1000,
				hasOnThisDay: true,
				chaosIndex: 42,
				chaosDescription: 'Moderate turbulence',
				chaosLastUpdated: '2024-01-01T12:00:00Z',
			});
		});

		it('should load specific batch in time travel mode', async () => {
			batchService.setTimeTravelBatch('historical-batch');

			const mockBatchResponse = {
				id: 'historical-batch',
				createdAt: '2023-12-01T12:00:00Z',
			};

			const mockCategoriesResponse = {
				categories: [{ id: 'cat-1', categoryId: 'world', categoryName: 'World' }],
				hasOnThisDay: false,
			};

			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockBatchResponse,
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockCategoriesResponse,
				} as Response)
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
				} as Response); // No chaos data for historical batch

			const result = await batchService.loadInitialData('en');

			expect(fetch).toHaveBeenNthCalledWith(1, '/api/batches/historical-batch');
			expect(result.batchId).toBe('historical-batch');
			expect(result.hasOnThisDay).toBe(false);
			expect(result.chaosIndex).toBeUndefined();
		});

		it('should handle API errors', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Internal Server Error',
			} as Response);

			await expect(batchService.loadInitialData('en')).rejects.toThrow(
				'Failed to get latest batch: Internal Server Error',
			);
		});

		it('should handle missing chaos index gracefully', async () => {
			const mockBatchResponse = {
				id: 'batch-1',
				createdAt: '2024-01-01T12:00:00Z',
			};

			const mockCategoriesResponse = {
				categories: [],
				hasOnThisDay: false,
			};

			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockBatchResponse,
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockCategoriesResponse,
				} as Response)
				.mockRejectedValueOnce(new Error('Network error')); // Chaos endpoint fails

			const result = await batchService.loadInitialData('en');

			expect(result.chaosIndex).toBeUndefined();
			expect(result.chaosDescription).toBeUndefined();
			// Should still return other data successfully
			expect(result.batchId).toBe('batch-1');
		});
	});
});
