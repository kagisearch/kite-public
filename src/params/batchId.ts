import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Matches legacy batchId formats:
 * - UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 * - Date slug: 2025-01-15.1 (YYYY-MM-DD.N)
 * - Legacy date: 2025-01-15 (YYYY-MM-DD)
 */
export const match: ParamMatcher = (param) => {
	// UUID pattern
	if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(param)) {
		return true;
	}

	// Date slug pattern (YYYY-MM-DD.N)
	if (/^\d{4}-\d{2}-\d{2}\.\d+$/.test(param)) {
		return true;
	}

	// Legacy date pattern (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
		return true;
	}

	return false;
};
