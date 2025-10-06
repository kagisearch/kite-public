/**
 * Format a timestamp into a relative time string like "Updated 2 hours ago"
 * @param timestamp - Unix timestamp in seconds
 * @param s - Translation function for i18n
 * @returns Formatted string like "Updated 2 hours ago"
 */
export function formatTimeAgo(
	timestamp: number,
	s: (key: string, params?: Record<string, string>) => string | undefined,
): string {
	const now = Date.now() / 1000; // Convert to seconds
	const diff = now - timestamp;

	// Just now (less than 60 seconds)
	if (diff < 60) {
		return s('time.updated.justNow') || 'Updated just now';
	}

	// Minutes
	if (diff < 3600) {
		const minutes = Math.floor(diff / 60);
		if (minutes === 1) {
			return s('time.updated.oneMinute') || 'Updated 1 minute ago';
		}
		return (
			s('time.updated.minutes', { count: minutes.toString() }) || `Updated ${minutes} minutes ago`
		);
	}

	// Hours
	if (diff < 86400) {
		const hours = Math.floor(diff / 3600);
		if (hours === 1) {
			return s('time.updated.oneHour') || 'Updated 1 hour ago';
		}
		return s('time.updated.hours', { count: hours.toString() }) || `Updated ${hours} hours ago`;
	}

	// Days
	const days = Math.floor(diff / 86400);
	if (days === 1) {
		return s('time.updated.oneDay') || 'Updated 1 day ago';
	}
	return s('time.updated.days', { count: days.toString() }) || `Updated ${days} days ago`;
}
