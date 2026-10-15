/**
 * API utility functions
 */

/**
 * Parse a query-string integer, clamp it to a range, and fall back to a
 * default on missing or non-numeric input.
 *
 * `parseInt('abc', 10)` returns `NaN`, which silently slips through
 * `Math.min(Math.max(1, NaN), 100)` (both yield `NaN`). Using NaN as a
 * SQL `LIMIT` or array slice index breaks query planning. This helper
 * gives one safe path that every endpoint can share.
 */
export function clampQueryInt(
	raw: string | null,
	defaultValue: number,
	min: number,
	max: number,
): number {
	if (raw === null || raw === '') return defaultValue;
	const parsed = parseInt(raw, 10);
	if (Number.isNaN(parsed)) return defaultValue;
	return Math.min(Math.max(min, parsed), max);
}

/**
 * Remove null and undefined fields from an object recursively
 * This helps reduce response payload size by eliminating unnecessary null values
 */
export function removeNullFields<T>(obj: T): T {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj
			.filter((item) => item !== null && item !== undefined)
			.map((item) => removeNullFields(item))
			.filter((item) => {
				// Filter out null/undefined that may have been introduced
				if (item === null || item === undefined) {
					return false;
				}
				// Filter out empty objects after cleaning
				if (typeof item === 'object' && !Array.isArray(item)) {
					return Object.keys(item).length > 0;
				}
				return true;
			}) as T;
	}

	if (typeof obj === 'object') {
		const cleaned: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			if (value !== null && value !== undefined) {
				cleaned[key] = removeNullFields(value);
			}
		}
		return cleaned as T;
	}

	return obj;
}
