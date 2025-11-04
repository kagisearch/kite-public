import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Matches encoded batch or article ID formats:
 * - Batch only: 9 digits (YYYYMMDDS) - e.g., 202501151
 * - Article: 10+ digits (YYYYMMDDS + cluster ID) - e.g., 202501151998
 */
export const match: ParamMatcher = (param) => {
	// Must be 9 or more digits
	return /^\d{9,}$/.test(param);
};
