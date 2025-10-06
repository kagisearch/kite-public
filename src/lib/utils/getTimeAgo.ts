import type { Article } from '$lib/types';

/**
 * Get a simple relative time string like "9h" or "2d"
 * @param dateString - Date string from article
 * @returns Formatted string like "9h", "2d", etc.
 */
export function getTimeAgo(dateString: string): string {
	try {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSeconds = Math.floor(diffMs / 1000);
		const diffMinutes = Math.floor(diffSeconds / 60);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffDays > 0) {
			return `${diffDays}d`;
		} else if (diffHours > 0) {
			return `${diffHours}h`;
		} else if (diffMinutes > 0) {
			return `${diffMinutes}m`;
		} else {
			return 'now';
		}
	} catch (error) {
		console.error('Error parsing date:', dateString, error);
		return '';
	}
}

/**
 * Get the most recent article date from a list of articles
 * @param articles - Array of articles
 * @param domain - Domain name to filter by
 * @returns Most recent date string or null
 */
export function getMostRecentArticleDate(articles: Article[], domain: string): string | null {
	const domainArticles = articles.filter((a) => a.domain === domain);
	if (domainArticles.length === 0) return null;

	// Sort articles by date (most recent first)
	const sortedArticles = domainArticles.sort((a, b) => {
		try {
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		} catch {
			return 0;
		}
	});

	return sortedArticles[0]?.date || null;
}
