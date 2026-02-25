/**
 * API utility functions
 */

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
