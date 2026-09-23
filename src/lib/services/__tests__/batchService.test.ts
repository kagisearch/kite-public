import { batchService } from '../batchService';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

			// Need to pass isHistorical=true to enable time travel mode
			batchService.setTimeTravelBatch('batch-123', null, null, true);
			expect(batchService.isTimeTravelMode()).toBe(true);
			expect(batchService.getCurrentBatchId()).toBe('batch-123');

			batchService.setTimeTravelBatch(null);
			expect(batchService.isTimeTravelMode()).toBe(false);
			expect(batchService.getCurrentBatchId()).toBe(null);
		});
	});
});
// loadInitialData tests removed — method was deleted (SSR seed replaced it)
