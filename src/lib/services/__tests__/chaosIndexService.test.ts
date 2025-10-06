import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchService } from '../batchService';
import { chaosIndexService } from '../chaosIndexService';

// Mock fetch
global.fetch = vi.fn();

// Mock batchService
vi.mock('../batchService', () => ({
	batchService: {
		getCurrentBatchId: vi.fn(),
	},
}));

describe('ChaosIndexService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadChaosIndex', () => {
		it('should load chaos index for latest batch', async () => {
			vi.mocked(batchService.getCurrentBatchId).mockReturnValue(null);

			const mockResponse = {
				chaosIndex: 65,
				chaosDescription: 'High global turbulence',
				chaosLastUpdated: '2024-01-01T12:00:00Z',
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await chaosIndexService.loadChaosIndex('en');

			expect(fetch).toHaveBeenCalledWith('/api/batches/latest/chaos?lang=en');
			expect(result).toEqual(mockResponse);
		});

		it('should load chaos index for specific batch in time travel mode', async () => {
			vi.mocked(batchService.getCurrentBatchId).mockReturnValue('batch-123');

			const mockResponse = {
				chaosIndex: 45,
				chaosDescription: 'Moderate turbulence',
				chaosLastUpdated: '2023-12-01T12:00:00Z',
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await chaosIndexService.loadChaosIndex('en');

			expect(fetch).toHaveBeenCalledWith('/api/batches/batch-123/chaos?lang=en');
			expect(result).toEqual(mockResponse);
		});

		it('should return null when chaos index is not available (404)', async () => {
			vi.mocked(batchService.getCurrentBatchId).mockReturnValue(null);

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
			} as Response);

			const result = await chaosIndexService.loadChaosIndex('en');

			expect(result).toBeNull();
		});

		it('should throw error for other API failures', async () => {
			vi.mocked(batchService.getCurrentBatchId).mockReturnValue(null);

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			} as Response);

			await expect(chaosIndexService.loadChaosIndex('en')).rejects.toThrow(
				'Failed to load chaos index: Internal Server Error',
			);
		});
	});

	describe('getChaosIndexHistory', () => {
		it('should fetch chaos index history', async () => {
			const mockHistory = [
				{ date: '2024-01-01', score: 65, summary: 'High turbulence' },
				{ date: '2023-12-31', score: 45, summary: 'Moderate turbulence' },
				{ date: '2023-12-30', score: 30, summary: 'Low turbulence' },
			];

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockHistory,
			} as Response);

			const result = await chaosIndexService.getChaosIndexHistory('en', 30);

			expect(fetch).toHaveBeenCalledWith('/api/chaos/history?lang=en&days=30');
			expect(result).toEqual(mockHistory);
		});

		it('should return empty array on error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			const result = await chaosIndexService.getChaosIndexHistory('en');

			expect(result).toEqual([]);
		});

		it('should handle API errors gracefully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Bad Request',
			} as Response);

			const result = await chaosIndexService.getChaosIndexHistory('en');

			expect(result).toEqual([]);
		});
	});
});
