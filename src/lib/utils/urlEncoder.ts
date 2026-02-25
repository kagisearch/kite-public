/**
 * URL encoder/decoder for readable article URLs
 *
 * === NEW FORMAT (current) ===
 * Category format: /{category}/{batch-code}
 *   Example: /world/202501151
 * Article format: /{category}/{batch-code-cluster}/{slug}
 *   Example: /world/202501151998/french-prime-minister-resigns
 * Where batch-code is YYYYMMDDS (date + sequence)
 *
 * === LEGACY FORMATS (backward compatible) ===
 * 1. Data slug format: /{batchId}/{categoryId}/{storyIndex}
 *    Example: /2025-01-15.1/world/5
 *    batchId format: YYYY-MM-DD.N (date + sequence)
 *
 * 2. UUID format: /{batchId}/{categoryId}/{storyIndex}
 *    Example: /a1b2c3d4-e5f6-7890-abcd-ef1234567890/world/5
 *    batchId format: UUID string
 *
 * 3. Legacy date format: /{batchId}/{categoryId}/{storyIndex}
 *    Example: /2025-01-15/world/5
 *    batchId format: YYYY-MM-DD (date only, no sequence)
 *
 * The parseUrl() function automatically detects and handles all formats.
 */

/**
 * Convert ISO date string to batch slug format YYYY-MM-DD.1
 * Always uses sequence .1 since we don't track multiple batches per day
 * @throws {Error} If createdAt is not provided (to prevent using current date as fallback)
 */
export function dateSlugFromTimestamp(createdAt: string): string {
	if (!createdAt) {
		throw new Error(
			'createdAt is required - cannot generate date slug without batch creation timestamp',
		);
	}
	const date = new Date(createdAt);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid createdAt timestamp: ${createdAt}`);
	}
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}.1`;
}

/**
 * Encode batch ID into a compact code
 * Format: YYYYMMDDS
 * Examples:
 *   batchId "2025-01-15.1" = 202501151
 *   batchId "2025-06-21.1" = 202506211
 */
export function encodeBatchId(batchId: string): string {
	// Extract date components from YYYY-MM-DD.S format where S is batch sequence (required)
	const batchMatch = batchId.match(/^(\d{4})-(\d{2})-(\d{2})\.(\d+)$/);
	if (!batchMatch) {
		throw new Error(
			`Invalid batch ID format: ${batchId}. Expected format: YYYY-MM-DD.N (e.g., 2025-01-15.1)`,
		);
	}

	const [, year, month, day, sequence] = batchMatch;
	return `${year}${month}${day}${sequence}`;
}

/**
 * Encode batch ID and article ID into a single number
 * Format: YYYYMMDDS concatenated with cluster_number
 * Examples:
 *   batchId "2025-01-15.1" + cluster 998 = 202501151998
 *   batchId "2025-01-15.2" + cluster 998 = 202501152998
 *   batchId "2025-06-21.1" + cluster 3327998 = 2025062113327998
 */
export function encodeArticleId(batchId: string, clusterId: number): string {
	const batchCode = encodeBatchId(batchId);
	return `${batchCode}${clusterId}`;
}

/**
 * Decode batch code back into batch ID
 * Format: YYYYMMDDS
 * Examples:
 *   202501151 = batchId "2025-01-15.1"
 *   202506211 = batchId "2025-06-21.1"
 */
export function decodeBatchId(encoded: string): string | null {
	// Must be exactly 9 digits (8 for date + 1 for sequence)
	if (encoded.length !== 9 || !/^\d{9}$/.test(encoded)) {
		return null;
	}

	// Extract date (first 8 digits)
	const year = encoded.substring(0, 4);
	const month = encoded.substring(4, 6);
	const day = encoded.substring(6, 8);

	// Validate date components
	const yearNum = parseInt(year, 10);
	const monthNum = parseInt(month, 10);
	const dayNum = parseInt(day, 10);

	if (
		yearNum < 2020 ||
		yearNum > 2100 ||
		monthNum < 1 ||
		monthNum > 12 ||
		dayNum < 1 ||
		dayNum > 31
	) {
		return null;
	}

	// Extract batch sequence (9th digit)
	const batchSequence = encoded.charAt(8);
	if (!/^\d$/.test(batchSequence)) {
		return null;
	}

	return `${year}-${month}-${day}.${batchSequence}`;
}

/**
 * Decode article ID back into batch ID and cluster number
 * Format: First 8 digits are YYYYMMDD, 9th digit is batch sequence, rest is cluster_number
 * Examples:
 *   202501151998 = batchId "2025-01-15.1" + cluster 998
 *   202501152998 = batchId "2025-01-15.2" + cluster 998
 *   2025062113327998 = batchId "2025-06-21.1" + cluster 3327998
 */
export function decodeArticleId(encoded: string): { batchId: string; clusterId: number } | null {
	// Must be at least 10 digits (8 for date + 1 for sequence + at least 1 for cluster)
	if (encoded.length < 10 || !/^\d+$/.test(encoded)) {
		return null;
	}

	// Extract date (first 8 digits)
	const year = encoded.substring(0, 4);
	const month = encoded.substring(4, 6);
	const day = encoded.substring(6, 8);

	// Validate date components
	const yearNum = parseInt(year, 10);
	const monthNum = parseInt(month, 10);
	const dayNum = parseInt(day, 10);

	if (
		yearNum < 2020 ||
		yearNum > 2100 ||
		monthNum < 1 ||
		monthNum > 12 ||
		dayNum < 1 ||
		dayNum > 31
	) {
		return null;
	}

	// Extract batch sequence (single digit) and cluster ID
	// Batch sequences are typically 1-9 (single digit)
	const restAfterDate = encoded.substring(8);

	if (restAfterDate.length < 2) {
		return null; // Need at least 1 digit for sequence + 1 for cluster
	}

	const batchSequence = restAfterDate.charAt(0);
	const clusterIdStr = restAfterDate.substring(1);

	if (!/^\d$/.test(batchSequence)) {
		return null;
	}

	const clusterId = parseInt(clusterIdStr, 10);

	if (Number.isNaN(clusterId) || clusterId <= 0) {
		return null;
	}

	const batchId = `${year}-${month}-${day}.${batchSequence}`;
	return { batchId, clusterId };
}

/**
 * Generate URL slug from article title
 * Supports Unicode characters (Arabic, Chinese, etc.) for readable international URLs
 * Converts title to lowercase, replaces spaces and special chars with hyphens
 */
export function generateSlug(title: string): string {
	return (
		title
			.toLowerCase()
			// Keep Unicode letters/numbers, whitespace, and hyphens; remove punctuation and special chars
			.replace(/[^\p{L}\p{N}\s-]/gu, '') // \p{L} = any Unicode letter, \p{N} = any Unicode number
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/-+/g, '-') // Replace multiple hyphens with single
			.replace(/^-+|-+$/g, '')
	); // Trim hyphens from start/end
}

/**
 * Build a category URL (no article)
 * Format: /{category}/{batch-code}
 * @param categoryId - Category identifier
 * @param dateSlugOrCreatedAt - Either a date slug (YYYY-MM-DD.N) or ISO timestamp to derive it from
 */
export function buildCategoryUrl(categoryId: string, dateSlugOrCreatedAt: string): string {
	// If it's already a date slug (YYYY-MM-DD.N), use it directly
	// Otherwise assume it's a createdAt timestamp and derive the date slug
	const dateSlug = /^\d{4}-\d{2}-\d{2}\.\d+$/.test(dateSlugOrCreatedAt)
		? dateSlugOrCreatedAt
		: dateSlugFromTimestamp(dateSlugOrCreatedAt);

	const batchCode = encodeBatchId(dateSlug);
	return `/${encodeURIComponent(categoryId)}/${batchCode}`;
}

/**
 * Build an article URL
 * Format: /{category}/{batch-code-cluster}/{slug}
 * @param categoryId - Category identifier
 * @param dateSlugOrCreatedAt - Either a date slug (YYYY-MM-DD.N) or ISO timestamp to derive it from
 * @param clusterId - Cluster/story ID
 * @param title - Story title for slug generation
 */
export function buildArticleUrl(
	categoryId: string,
	dateSlugOrCreatedAt: string,
	clusterId: number,
	title: string,
): string {
	// If it's already a date slug (YYYY-MM-DD.N), use it directly
	// Otherwise assume it's a createdAt timestamp and derive the date slug
	const dateSlug = /^\d{4}-\d{2}-\d{2}\.\d+$/.test(dateSlugOrCreatedAt)
		? dateSlugOrCreatedAt
		: dateSlugFromTimestamp(dateSlugOrCreatedAt);

	const encodedId = encodeArticleId(dateSlug, clusterId);
	const slug = generateSlug(title);

	return `/${encodeURIComponent(categoryId)}/${encodedId}/${slug}`;
}

/**
 * Parse a URL (supports new encoded format + legacy formats)
 *
 * New formats:
 * - Category: /{category}/{batch-code} (e.g., /world/202501151)
 * - Article: /{category}/{batch-code-cluster}/{slug} (e.g., /world/202501151998/story-title)
 *
 * Legacy formats (backward compatibility):
 * - Data slug: /{batchId}/{categoryId}/{storyIndex} where batchId is YYYY-MM-DD.N
 * - UUID: /{batchId}/{categoryId}/{storyIndex} where batchId is UUID
 */
export function parseUrl(pathname: string): {
	categoryId: string;
	batchId: string;
	clusterId?: number;
	slug?: string;
	storyIndex?: number;
	isLegacyFormat?: boolean;
} | null {
	const parts = pathname.split('/').filter(Boolean);

	// Must have at least 2 parts
	if (parts.length < 2) {
		return null;
	}

	const [firstPart, secondPart, ...restParts] = parts;

	// Check for legacy format: first part is batch ID (UUID or date slug)
	const isLegacyBatchId = isLegacyBatchIdFormat(firstPart);

	if (isLegacyBatchId) {
		// Legacy format: /{batchId}/{categoryId}/{storyIndex}
		const batchId = firstPart;
		const categoryId = decodeURIComponent(secondPart);
		const storyIndex = restParts[0] ? parseInt(restParts[0], 10) : undefined;

		return {
			categoryId,
			batchId,
			storyIndex: !Number.isNaN(storyIndex!) ? storyIndex : undefined,
			isLegacyFormat: true,
		};
	}

	// New format: /{category}/{encoded-id}/...
	const categoryId = decodeURIComponent(firstPart);
	const encoded = secondPart;

	// Try to decode as batch-only (9 digits)
	if (encoded.length === 9 && /^\d{9}$/.test(encoded)) {
		const batchId = decodeBatchId(encoded);
		if (batchId) {
			// Category-only URL
			return { categoryId, batchId };
		}
	}

	// Try to decode as article (10+ digits)
	if (restParts.length >= 1 && /^\d{10,}$/.test(encoded)) {
		const slug = restParts.join('/'); // Handle any extra slashes in the slug
		const decoded = decodeArticleId(encoded);
		if (decoded) {
			// Article URL
			return {
				categoryId,
				batchId: decoded.batchId,
				clusterId: decoded.clusterId,
				slug,
			};
		}
	}

	return null;
}

/**
 * Check if a string is a legacy batch ID format (UUID or date slug)
 */
function isLegacyBatchIdFormat(str: string): boolean {
	// Date slug pattern (YYYY-MM-DD.N)
	if (/^\d{4}-\d{2}-\d{2}\.\d+$/.test(str)) {
		return true;
	}

	// UUID pattern
	if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(str)) {
		return true;
	}

	// Legacy date pattern (YYYY-MM-DD) without sequence number
	if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
		return true;
	}

	return false;
}
