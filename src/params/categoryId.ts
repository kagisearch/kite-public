import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Matches categoryId format: lowercase letters/numbers, may include hyphens, underscores, parentheses, pipes
 * Example: world, usa, science-technology, web3, switzerland_(de), usa_|_new_york_city
 * Also matches URL-encoded variants (e.g., usa_%7C_austin%2C_tx for "USA | Austin, TX")
 * Must NOT be a legacy batch ID format (UUID or date slug)
 */
export const match: ParamMatcher = (param) => {
	// Decode the parameter first to check its validity
	let decoded: string;
	try {
		decoded = decodeURIComponent(param);
	} catch {
		// If decoding fails, check the raw param
		decoded = param;
	}

	// Must be lowercase alphanumeric with optional hyphens, underscores, parentheses, pipes, commas
	if (!/^[a-z0-9_(),|]+(-[a-z0-9_(),|]+)*$/i.test(decoded)) {
		return false;
	}

	// Reject legacy batch ID formats
	// UUID pattern
	if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(param)) {
		return false;
	}

	// Date slug pattern (YYYY-MM-DD.N)
	if (/^\d{4}-\d{2}-\d{2}\.\d+$/.test(param)) {
		return false;
	}

	// Legacy date pattern (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
		return false;
	}

	return true;
};
