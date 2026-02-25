export type FeedCheckStatus = 'pending' | 'checking' | 'valid' | 'error' | 'unknown';

export type FeedCheckResult = {
	url: string;
	status: FeedCheckStatus;
	contentType?: string;
	statusCode?: number;
	error?: string;
};

export type KiteFeedsCategory = {
	category_type: string;
	source_language: string;
	display_names: Record<string, string>;
	feeds: string[];
};

export type KiteFeedsData = Record<string, KiteFeedsCategory>;

/**
 * Fix mojibake (double-encoded UTF-8) in a string.
 * Detects strings where UTF-8 bytes were stored as Latin-1 characters
 * (e.g. "Asië" → "AsiÃ«") and reverses the encoding error.
 */
export function fixMojibake(str: string): string {
	try {
		// Try to interpret each char as a Latin-1 byte
		const bytes = new Uint8Array(
			[...str].map((c) => {
				const code = c.charCodeAt(0);
				if (code > 255) throw new Error('Not Latin-1');
				return code;
			}),
		);
		// Decode those bytes as UTF-8
		const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		// Only use the fix if it actually changed something
		return fixed !== str ? fixed : str;
	} catch {
		// Contains characters outside Latin-1 range, or invalid UTF-8 — not mojibake
		return str;
	}
}

/**
 * Fix mojibake in all display_names across a KiteFeedsData object.
 * Returns a new object with corrected encoding.
 */
export function fixFeedsDisplayNames(data: KiteFeedsData): KiteFeedsData {
	const fixed: KiteFeedsData = {};
	for (const [key, category] of Object.entries(data)) {
		fixed[key] = {
			...category,
			display_names: Object.fromEntries(
				Object.entries(category.display_names).map(([lang, name]) => [lang, fixMojibake(name)]),
			),
		};
	}
	return fixed;
}

export type PendingPrCategory = {
	prNumber: number;
	prUrl: string;
	categoryName: string;
	feedCount: number;
	isNew: boolean;
	author: string;
	createdAt: string;
};

/**
 * Parse core_feeds.py content into KiteFeedsData format.
 * The file contains a Python dict: feeds = { "Name": ["url1", "url2", ...], ... }
 */
export function parseCoreFeedsPy(content: string): KiteFeedsData {
	const result: KiteFeedsData = {};

	// Match each category block: "CategoryName": [\n  "url",\n  ...\n],
	const categoryPattern = /^\s{4}"([^"]+)"\s*:\s*\[([\s\S]*?)\]/gm;

	for (const match of content.matchAll(categoryPattern)) {
		const categoryName = match[1];
		const urlBlock = match[2];

		// Extract all quoted URLs from the block
		const urlPattern = /"(https?:\/\/[^"]+)"/g;
		const urls = [...urlBlock.matchAll(urlPattern)].map((m) => m[1]);

		if (urls.length > 0) {
			result[categoryName] = {
				category_type: 'core',
				source_language: 'en',
				display_names: { en: categoryName },
				feeds: urls,
			};
		}
	}

	return result;
}

/**
 * Serialize a core feeds dict back to Python format.
 * Produces: feeds = { "Name": ["url", ...], ... }
 */
export function serializeCoreFeedsPy(feeds: Record<string, string[]>): string {
	const sortedKeys = Object.keys(feeds).sort((a, b) => a.localeCompare(b));
	const entries = sortedKeys.map((key) => {
		const urls = feeds[key].sort();
		const urlLines = urls.map((url) => `        "${url}",`).join('\n');
		return `    "${key}": [\n${urlLines}\n    ],`;
	});

	return `feeds = {\n${entries.join('\n')}\n}\n`;
}

/**
 * Parse a PR body to extract contribution metadata.
 * Used by the pending-prs endpoint.
 */
export function parsePrBody(
	body: string,
): { categoryName: string; feedCount: number; isNew: boolean } | null {
	const categoryMatch = body.match(/\*\*Category\*\*:\s*(.+)/);
	const feedCountMatch = body.match(/\*\*Feeds added\*\*:\s*(\d+)/);
	const isNew = body.includes('## New Category');

	if (!categoryMatch) return null;

	return {
		categoryName: categoryMatch[1].trim(),
		feedCount: feedCountMatch ? parseInt(feedCountMatch[1], 10) : 0,
		isNew,
	};
}

/**
 * Parse a textarea input into an array of clean, unique URLs.
 * Accepts URLs separated by newlines, commas, or spaces.
 */
export function parseFeedUrls(input: string): string[] {
	const urls = input
		.split(/[\s,]+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const valid: string[] = [];
	for (const url of urls) {
		try {
			const parsed = new URL(url);
			if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
				valid.push(parsed.href);
			}
		} catch {
			// Skip invalid URLs
		}
	}

	// Deduplicate
	return [...new Set(valid)];
}

/**
 * Separate new feeds from ones that already exist in the category.
 */
export function deduplicateFeeds(
	newUrls: string[],
	existingUrls: string[],
): { unique: string[]; duplicates: string[] } {
	const existingSet = new Set(existingUrls.map((u) => u.toLowerCase()));
	const unique: string[] = [];
	const duplicates: string[] = [];

	for (const url of newUrls) {
		if (existingSet.has(url.toLowerCase())) {
			duplicates.push(url);
		} else {
			unique.push(url);
		}
	}

	return { unique, duplicates };
}

/**
 * Generate the modified kite_feeds.json object with new feeds added.
 */
export function generateModifiedJson(
	original: KiteFeedsData,
	category: string,
	newFeeds: string[],
	isNew: boolean,
	sourceLanguage?: string,
): KiteFeedsData {
	const result = { ...original };

	if (isNew) {
		result[category] = {
			category_type: 'topic',
			source_language: sourceLanguage || 'en',
			display_names: { en: category },
			feeds: [...newFeeds].sort(),
		};
	} else {
		const existing = result[category];
		if (existing) {
			result[category] = {
				...existing,
				feeds: [...existing.feeds, ...newFeeds].sort(),
			};
		}
	}

	// Sort categories alphabetically by key
	const sorted: KiteFeedsData = {};
	for (const key of Object.keys(result).sort((a, b) => a.localeCompare(b))) {
		sorted[key] = result[key];
	}

	return sorted;
}

/**
 * Generate a pre-filled GitHub issue URL as a fallback when GITHUB_TOKEN is not available.
 */
export function generateIssueUrl(
	category: string,
	isNew: boolean,
	feeds: FeedCheckResult[],
): string {
	const validFeeds = feeds.filter((f) => f.status === 'valid');
	const unknownFeeds = feeds.filter((f) => f.status === 'unknown');
	const errorFeeds = feeds.filter((f) => f.status === 'error');

	const feedListLines = feeds
		.map((f) => {
			const icon =
				f.status === 'valid' ? '\u2705' : f.status === 'unknown' ? '\u26a0\ufe0f' : '\u274c';
			return `- ${icon} ${f.url}`;
		})
		.join('\n');

	const body = `## Category: ${category} (${isNew ? 'new' : 'existing'})

## Feed Validation Summary
- ${validFeeds.length} valid
- ${unknownFeeds.length} unverified (may work server-side)
- ${errorFeeds.length} errors

## Feeds
${feedListLines}
`;

	const title = isNew ? `New Category: ${category}` : `Add ${feeds.length} feed(s) to ${category}`;

	const baseUrl = 'https://github.com/kagisearch/kite-public/issues/new';
	const params = new URLSearchParams({
		labels: 'feeds',
		title,
		body,
	});

	const fullUrl = `${baseUrl}?${params.toString()}`;

	// GitHub issue URLs have a practical limit of ~8,000 characters
	if (fullUrl.length > 7500) {
		// Fall back to a shorter version without individual feed statuses
		const shortBody = `## Category: ${category} (${isNew ? 'new' : 'existing'})

## Feeds (${feeds.length} total)
${feeds.map((f) => f.url).join('\n')}
`;
		const shortParams = new URLSearchParams({
			labels: 'feeds',
			title,
			body: shortBody,
		});
		return `${baseUrl}?${shortParams.toString()}`;
	}

	return fullUrl;
}

/**
 * Generate data for manual PR creation when GITHUB_TOKEN is not available.
 * For kite_feeds.json, generates the full file content so contributors can
 * copy-paste and replace the entire file. For core_feeds.py, generates a snippet.
 */
export function generateManualPrSnippet(opts: {
	category: string;
	isNew: boolean;
	feeds: string[];
	sourceLanguage?: string;
	isCore: boolean;
	communityFeedsData?: KiteFeedsData;
}): { editUrl: string; fileName: string; content: string; isNew: boolean; isFullFile: boolean } {
	const { category, isNew, feeds, sourceLanguage, isCore, communityFeedsData } = opts;

	if (isCore && !isNew) {
		// Core category: edit core_feeds.py (snippet mode)
		const feedLines = feeds.map((url) => `        "${url}",`).join('\n');
		return {
			editUrl: 'https://github.com/kagisearch/kite-public/edit/main/core_feeds.py',
			fileName: 'core_feeds.py',
			content: feedLines,
			isNew: false,
			isFullFile: false,
		};
	}

	// Community category: generate the full kite_feeds.json with changes applied
	if (communityFeedsData) {
		const modified = generateModifiedJson(
			communityFeedsData,
			category,
			feeds,
			isNew,
			sourceLanguage,
		);
		// Fix mojibake in display_names (source file has double-encoded UTF-8)
		const fixedData = fixFeedsDisplayNames(modified);
		return {
			editUrl: 'https://github.com/kagisearch/kite-public/edit/main/kite_feeds.json',
			fileName: 'kite_feeds.json',
			content: JSON.stringify(fixedData, null, 2),
			isNew,
			isFullFile: true,
		};
	}

	// Fallback: snippet mode (when communityFeedsData is unavailable)
	if (isNew) {
		const entry = {
			category_type: 'topic',
			source_language: sourceLanguage || 'en',
			display_names: { en: category },
			feeds: [...feeds].sort(),
		};
		return {
			editUrl: 'https://github.com/kagisearch/kite-public/edit/main/kite_feeds.json',
			fileName: 'kite_feeds.json',
			content: `"${category}": ${JSON.stringify(entry, null, 2)}`,
			isNew: true,
			isFullFile: false,
		};
	}

	const feedLines = feeds.map((url) => `    "${url}",`).join('\n');
	return {
		editUrl: 'https://github.com/kagisearch/kite-public/edit/main/kite_feeds.json',
		fileName: 'kite_feeds.json',
		content: feedLines,
		isNew: false,
		isFullFile: false,
	};
}

/**
 * Copy text to clipboard. Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
