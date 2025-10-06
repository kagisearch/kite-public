import { browser } from '$app/environment';

/**
 * Feature flags for controlling application features
 * These can be toggled to enable/disable features without code changes
 */

// Check environment variable or URL parameter to enable historical search
const isHistoricalSearchEnabled = () => {
	// Server-side: check environment variable
	if (!browser && typeof process !== 'undefined') {
		return process.env.ENABLE_HISTORICAL_SEARCH === 'true';
	}

	// Client-side: check URL parameter for testing
	if (browser) {
		const params = new URLSearchParams(window.location.search);
		if (params.has('historical')) {
			return params.get('historical') === 'true';
		}
	}

	// Default: disabled
	return false;
};

export const features = {
	/**
	 * Enable historical search and time travel functionality
	 * When enabled:
	 * - Historical search queries are executed
	 * - Filter suggestions are shown (category:, from:, to:)
	 * - Filter tips carousel is displayed
	 * - Load more pagination is available
	 * - Time travel button appears in the header
	 * - Users can browse historical news batches
	 *
	 * When disabled:
	 * - Only local/current batch search works
	 * - No filter suggestions
	 * - No filter tips carousel
	 * - Simpler search experience
	 * - Time travel button is hidden
	 *
	 * Enable via:
	 * - Environment variable: ENABLE_HISTORICAL_SEARCH=true
	 * - URL parameter (testing): ?historical=true
	 */
	historicalSearch: isHistoricalSearchEnabled(),
} as const;

export type Features = typeof features;
