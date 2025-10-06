import { goto } from '$app/navigation';
import { displaySettings } from '$lib/data/settings.svelte.js';
import { timeTravel } from '$lib/stores/timeTravel.svelte';
import { dataReloadService, dataService } from './dataService';

export interface TimeTravelOptions {
	batchId: string;
	batchDate?: string;
	categoryId?: string;
	storyIndex?: number;
	reload?: boolean;
	navigate?: boolean;
}

class TimeTravelNavigationService {
	/**
	 * Enter time travel mode for a specific batch
	 */
	async enterTimeTravel(options: TimeTravelOptions): Promise<void> {
		const { batchId, batchDate, categoryId, storyIndex, reload = true, navigate = true } = options;

		console.log('🕐 Entering time travel mode:', {
			batchId,
			batchDate,
			categoryId,
			storyIndex,
			reload,
			navigate,
		});

		// Set time travel mode in the data service
		dataService.setTimeTravelBatch(batchId);

		// Set the batch in the time travel store
		timeTravel.selectBatch(batchId);

		// Set the date if provided
		if (batchDate) {
			const date = new Date(batchDate);
			if (!Number.isNaN(date.getTime())) {
				timeTravel.selectDate(date);
			} else {
				console.warn('Invalid batch date:', batchDate);
			}
		}

		// Reload data if requested
		if (reload) {
			await dataReloadService.reloadData();
		}

		// Navigate to the URL if requested
		if (navigate) {
			// Build and navigate to the URL
			let targetUrl = `/${batchId}`;
			if (categoryId) {
				targetUrl += `/${categoryId}`;
			}
			if (storyIndex !== undefined && storyIndex !== null) {
				targetUrl += `/${storyIndex}`;
			}

			await goto(targetUrl, { replaceState: false });
		}
	}

	/**
	 * Exit time travel mode and return to latest batch
	 */
	async exitTimeTravel(): Promise<void> {
		console.log('🕐 Exiting time travel mode');

		// Reset time travel state
		timeTravel.reset();
		dataService.setTimeTravelBatch(null);

		// Navigate to latest or root
		const targetUrl = displaySettings.useLatestUrls ? '/latest' : '/';
		await goto(targetUrl);
	}

	/**
	 * Check if we're currently in time travel mode
	 */
	isInTimeTravel(): boolean {
		return dataService.isTimeTravelMode?.() || false;
	}
}

export const timeTravelNavigationService = new TimeTravelNavigationService();
