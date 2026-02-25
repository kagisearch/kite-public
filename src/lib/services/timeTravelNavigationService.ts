import { goto, replaceState } from '$app/navigation';
import { categorySettings } from '$lib/data/settings.svelte';
import { timeTravel } from '$lib/stores/timeTravel.svelte';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import { dataReloadService, dataService } from './dataService';
import { UrlNavigationService } from './urlNavigationService';

export interface TimeTravelOptions {
	batchId: string;
	batchDate?: string;
	dateSlug?: string;
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
		const {
			batchId,
			batchDate,
			dateSlug,
			categoryId,
			storyIndex,
			reload = true,
			navigate = true,
		} = options;

		console.log('🕐 Entering time travel mode:', {
			batchId,
			batchDate,
			dateSlug,
			categoryId,
			storyIndex,
			reload,
			navigate,
		});

		// Set time travel mode in the data service with batch date and dateSlug for URL generation
		// Pass isHistorical=true since we're entering time travel mode
		dataService.setTimeTravelBatch(batchId, batchDate, dateSlug, true, 'modal');

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

		// Update the URL if requested
		if (navigate) {
			// After data reload, the timeTravelBatch store has the dateSlug
			// Use UrlNavigationService to build proper URLs with dateSlug
			const batchData = timeTravelBatch.getBatchData();

			// Use provided categoryId, or default to first enabled category
			const effectiveCategoryId = categoryId || categorySettings.enabled[0] || 'world';

			const targetUrl = UrlNavigationService.buildUrl(
				{
					batchId: batchData.batchId || batchId,
					batchDateSlug: batchData.batchDateSlug,
					categoryId: effectiveCategoryId,
					storyIndex,
				},
				undefined, // no language in URL
				false, // not latest batch
				batchData.batchCreatedAt,
			);

			console.log('🕐 Updating URL to:', targetUrl);

			// If we already reloaded the data, use replaceState to just update the URL
			// without triggering a new page load. Otherwise use goto for full navigation.
			if (reload) {
				// Data already loaded - just update URL without navigation
				replaceState(targetUrl, {});
			} else {
				// No data reload - navigate normally which will trigger data load
				await goto(targetUrl, { replaceState: false });
			}
		}
	}

	/**
	 * Exit time travel mode and return to latest batch
	 */
	async exitTimeTravel(): Promise<void> {
		console.log('🕐 Exiting time travel mode');

		// Reset time travel state
		timeTravel.reset();
		timeTravelBatch.clear();

		// Navigate to root - will use /category/latest URLs automatically
		await goto('/');
	}

	/**
	 * Check if we're currently in time travel mode
	 */
	isInTimeTravel(): boolean {
		return dataService.isTimeTravelMode?.() || false;
	}
}

export const timeTravelNavigationService = new TimeTravelNavigationService();
