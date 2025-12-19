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

/**
 * Calculate the next update time (noon UTC today or tomorrow)
 * @param lastUpdateDate - Optional last update date to check if we've already updated today
 * @returns Date object representing next noon UTC
 */
export function getNextUpdateTime(lastUpdateDate?: string): Date {
	const now = new Date();
	const noonUTC = new Date();
	noonUTC.setUTCHours(12, 0, 0, 0);

	// If noon UTC has already passed today
	if (now >= noonUTC) {
		// Check if we've had an update today
		if (lastUpdateDate) {
			const lastUpdate = new Date(lastUpdateDate);
			const todayStart = new Date();
			todayStart.setUTCHours(0, 0, 0, 0);

			// If last update was today, next update is tomorrow
			if (lastUpdate >= todayStart) {
				noonUTC.setUTCDate(noonUTC.getUTCDate() + 1);
				return noonUTC;
			}
		}
		// No update today yet, return "soon" (represented by current time)
		return now;
	}

	// Noon UTC hasn't passed yet, that's the next update
	return noonUTC;
}

/**
 * Get a formatted countdown to the next update
 * @param lastUpdateDate - Optional last update date to check if we've already updated today
 * @returns Object with display string and isSoon flag
 */
export function getNextUpdateCountdown(lastUpdateDate?: string): { text: string; isSoon: boolean } {
	const now = new Date();
	const nextUpdate = getNextUpdateTime(lastUpdateDate);

	// If nextUpdate equals now, it means we're past noon but no update yet
	if (nextUpdate.getTime() === now.getTime()) {
		return { text: '', isSoon: true };
	}

	const diffMs = nextUpdate.getTime() - now.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMinutes / 60);
	const remainingMinutes = diffMinutes % 60;

	if (diffHours > 0) {
		if (remainingMinutes > 0) {
			return { text: `${diffHours}h ${remainingMinutes}m`, isSoon: false };
		}
		return { text: `${diffHours}h`, isSoon: false };
	} else if (diffMinutes > 0) {
		return { text: `${diffMinutes}m`, isSoon: false };
	}

	return { text: '', isSoon: true };
}
