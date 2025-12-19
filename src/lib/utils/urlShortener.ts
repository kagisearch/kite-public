/**
 * URL generation utility for shareable links
 * Note: Language preferences are stored in localStorage, not in URLs
 */

interface ShareableState {
	batchId?: string | null;
	categoryId?: string | null;
	storyIndex?: number | null;
	dataLang?: string | null; // Deprecated: kept for backwards compatibility but not used
}

/**
 * Generate a share URL for the current state
 * Language settings are not included in URLs - they are stored in localStorage
 */
export function generateShareUrl(baseUrl: string, state: ShareableState): string {
	// Build URL from state components
	const parts = [];
	if (state.batchId) parts.push(state.batchId);
	if (state.categoryId) parts.push(state.categoryId);
	if (state.storyIndex !== null && state.storyIndex !== undefined) {
		parts.push(state.storyIndex.toString());
	}

	const url = `${baseUrl}/${parts.join('/')}`;

	// Language settings are in localStorage, not URL query parameters
	return url;
}
