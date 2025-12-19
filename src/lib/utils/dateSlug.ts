/**
 * Generate a date slug from a timestamp and batch position
 * Format: YYYY-MM-DD.N where N is the nth batch of that day
 *
 * @param createdAt - ISO timestamp or Date
 * @param batchIndex - 1-based index (1 for first batch of the day, 2 for second, etc.)
 * @returns Date slug string (e.g., "2025-10-06.1")
 */
export function generateDateSlug(createdAt: string | Date, batchIndex: number): string {
	const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}.${batchIndex}`;
}

/**
 * Parse a date slug to extract date and index
 *
 * @param dateSlug - Date slug string (e.g., "2025-10-06.1")
 * @returns Object with date and index, or null if invalid
 */
export function parseDateSlug(dateSlug: string): { date: string; index: number } | null {
	const match = /^(\d{4}-\d{2}-\d{2})\.(\d+)$/.exec(dateSlug);
	if (!match) return null;

	return {
		date: match[1],
		index: parseInt(match[2], 10),
	};
}

/**
 * Check if a string is a valid date slug format
 */
export function isDateSlug(str: string): boolean {
	return /^\d{4}-\d{2}-\d{2}\.\d+$/.test(str);
}
