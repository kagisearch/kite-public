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
		return obj.map((item) => removeNullFields(item)) as T;
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
