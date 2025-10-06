/**
 * URL generation utility for shareable links
 */

interface ShareableState {
	batchId?: string | null;
	categoryId?: string | null;
	storyIndex?: number | null;
	dataLang?: string | null;
}

/**
 * Generate a share URL for the current state
 */
export function generateShareUrl(baseUrl: string, state: ShareableState): string {
	// Build URL from state components
	const parts = [];
	if (state.batchId) parts.push(state.batchId);
	if (state.categoryId) parts.push(state.categoryId);
	if (state.storyIndex !== null && state.storyIndex !== undefined) {
		parts.push(state.storyIndex.toString());
	}

	let url = `${baseUrl}/${parts.join('/')}`;

	// Add language as query parameter if not English
	if (state.dataLang && state.dataLang !== 'en') {
		url += `?data_lang=${state.dataLang}`;
	}

	return url;
}
