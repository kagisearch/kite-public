import type { Story } from '$lib/types';

// Extended Story type for content filtering
export interface FilteredStory extends Story {
	_filtered?: boolean;
	_matchedKeywords?: string[];
}

interface FilterResult {
	shouldFilter: boolean;
	matchedKeywords: string[];
}

/**
 * Check if a story should be filtered based on keywords
 */
export function shouldFilterStory(
	story: Story,
	keywords: string[],
	scope: 'title' | 'summary' | 'all',
): FilterResult {
	if (!keywords || keywords.length === 0) {
		return { shouldFilter: false, matchedKeywords: [] };
	}

	const matchedKeywords: string[] = [];

	// Normalize keywords for case-insensitive matching
	const normalizedKeywords = keywords.map((k) => k.toLowerCase());

	// Build the text to check based on scope
	let textToCheck = '';

	if (scope === 'title' || scope === 'all') {
		textToCheck += `${(story.title || '').toLowerCase()} `;
	}

	if (scope === 'summary' || scope === 'all') {
		textToCheck += `${(story.short_summary || '').toLowerCase()} `;
	}

	if (scope === 'all') {
		// Also check perspectives and other content
		if (story.perspectives && Array.isArray(story.perspectives)) {
			story.perspectives.forEach((p) => {
				textToCheck += `${(p.text || '').toLowerCase()} `;
				if (p.sources && Array.isArray(p.sources)) {
					p.sources.forEach((s) => {
						textToCheck += `${(s.name || '').toLowerCase()} `;
					});
				}
			});
		}

		// Check source domains
		if (story.domains && Array.isArray(story.domains)) {
			story.domains.forEach((d) => {
				textToCheck += `${(d.name || '').toLowerCase()} `;
			});
		}

		// Check article URLs and domains
		if (story.articles && Array.isArray(story.articles)) {
			story.articles.forEach((a) => {
				textToCheck += `${(a.link || '').toLowerCase()} `;
				textToCheck += `${(a.domain || '').toLowerCase()} `;
			});
		}
	}

	// Check each keyword with whole word matching
	for (const keyword of normalizedKeywords) {
		// Create a regex for whole word matching
		// \b ensures word boundaries (start/end of word)
		// Special regex characters in keywords are escaped
		const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');

		if (regex.test(textToCheck)) {
			matchedKeywords.push(keyword);
		}
	}

	return {
		shouldFilter: matchedKeywords.length > 0,
		matchedKeywords,
	};
}

/**
 * Filter an array of stories based on content filter settings
 */
export function filterStories(
	stories: Story[],
	keywords: string[],
	scope: 'title' | 'summary' | 'all',
	filterMode: 'hide' | 'blur',
): { filtered: FilteredStory[]; hidden: Story[]; filteredCount: number } {
	if (!keywords || keywords.length === 0) {
		return { filtered: stories, hidden: [], filteredCount: 0 };
	}

	const filtered: FilteredStory[] = [];
	const hidden: Story[] = [];

	for (const story of stories) {
		const { shouldFilter, matchedKeywords } = shouldFilterStory(story, keywords, scope);

		if (shouldFilter) {
			if (filterMode === 'hide') {
				hidden.push(story);
			} else {
				// For blur mode, add metadata about why it was filtered
				filtered.push({
					...story,
					_filtered: true,
					_matchedKeywords: matchedKeywords,
				} as Story & { _filtered: boolean; _matchedKeywords: string[] });
			}
		} else {
			// Clean any existing filter metadata when story no longer matches
			const cleanStory: FilteredStory = { ...story };
			delete cleanStory._filtered;
			delete cleanStory._matchedKeywords;
			filtered.push(cleanStory);
		}
	}

	return {
		filtered,
		hidden,
		filteredCount:
			hidden.length + (filterMode === 'blur' ? filtered.filter((s) => s._filtered).length : 0),
	};
}
