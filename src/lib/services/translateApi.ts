/**
 * Kagi Translate API Service
 *
 * Uses the Kagi Translate API to simplify story content by "translating"
 * from source language to same language with a simpler reading level.
 */

// User-friendly reading level options
export type ReadingLevel = 'very-simple' | 'simple' | 'normal';

export interface TranslateResponse {
	success: boolean;
	translation?: string;
	error?: string;
}

// A simplified story has the same structure as a regular story
export interface SimplifiedStory {
	headline: string;
	summary: string;
	tldr: string;
	[key: string]: unknown;
}

export interface SimplifyStoryResponse {
	success: boolean;
	simplifiedStory?: SimplifiedStory;
	error?: string;
}

// Fields that should NOT be simplified (URLs, metadata, IDs, etc.)
const BLACKLIST = [
	'id',
	'cluster_number',
	'unique_domains',
	'number_of_titles',
	'sourceLanguage',
	'selectedLanguage',
	'category',
	'emoji',
	'articles',
	'domains',
	'primary_image',
	'secondary_image',
];

// Nested fields that contain URLs or metadata (exclude from simplification)
const NESTED_BLACKLIST = [
	'url',
	'link',
	'domain',
	'favicon',
	'sources',
	'date',
	'image',
	'image_caption',
	'credit',
];

// Type for JSON-like values used in simplification
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Recursively filter out blacklisted fields, keeping only user-facing text content
 */
function filterForSimplification(obj: JsonValue, path: string = ''): JsonValue {
	if (typeof obj === 'string') {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item, idx) => filterForSimplification(item, `${path}[${idx}]`));
	}

	if (obj && typeof obj === 'object') {
		const filtered: Record<string, JsonValue> = {};
		for (const [key, value] of Object.entries(obj)) {
			// Skip blacklisted top-level fields
			if (path === '' && BLACKLIST.includes(key)) {
				continue;
			}
			// Skip nested URL/metadata fields
			if (NESTED_BLACKLIST.includes(key)) {
				continue;
			}
			filtered[key] = filterForSimplification(value, path ? `${path}.${key}` : key);
		}
		return filtered;
	}

	return obj;
}

/**
 * Recursively merge simplified content back into original structure
 */
function mergeSimplified(original: JsonValue, simplified: JsonValue): JsonValue {
	if (typeof simplified === 'string') {
		return simplified;
	}

	if (Array.isArray(original) && Array.isArray(simplified)) {
		return original.map((item, idx) =>
			simplified[idx] !== undefined ? mergeSimplified(item, simplified[idx]) : item,
		);
	}

	if (original && typeof original === 'object' && simplified && typeof simplified === 'object') {
		const origObj = original as Record<string, JsonValue>;
		const simpObj = simplified as Record<string, JsonValue>;
		const result = { ...origObj };
		for (const key of Object.keys(simpObj)) {
			if (key in origObj) {
				result[key] = mergeSimplified(origObj[key], simpObj[key]);
			}
		}
		return result;
	}

	return original;
}

/**
 * Simplify an entire story by filtering out metadata, simplifying text, and merging back
 * Browser automatically sends session cookies with the request
 */
export async function simplifyStory(
	story: Record<string, unknown>,
	languageCode: string,
	readingLevel: ReadingLevel,
): Promise<SimplifyStoryResponse> {
	try {
		// Map user-friendly reading level to CEFR complexity
		const complexity = mapReadingLevel(readingLevel);

		// Filter out blacklisted fields (URLs, metadata, etc.)
		const filtered = filterForSimplification(story as unknown as JsonValue);
		const textJson = JSON.stringify(filtered);

		// Use our proxy endpoint to avoid CORS issues
		const response = await fetch('/api/simplify', {
			method: 'POST',
			credentials: 'include', // Include cookies in the request
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text: textJson,
				from: languageCode,
				to: languageCode, // Same language for simplification
				language_complexity: complexity,
				stream: false,
				translation_style: 'natural',
				formality: 'default',
				context:
					'Simplify the text for this story, keeping citations as is, they will be displayed separately. Return everything in a JSON format without ```json or markdown formatting, preserving all fields. Sacrificing information can be OK to reach the requested reading level.',
			}),
		});

		if (!response.ok) {
			return {
				success: false,
				error: `API returned ${response.status}: ${response.statusText}`,
			};
		}

		const data = await response.json();

		// Parse the translated JSON back into an object
		const translatedText = data.translation || data.text;
		const simplified = JSON.parse(translatedText);

		// Merge simplified text back into original story structure
		const simplifiedStory = mergeSimplified(
			story as unknown as JsonValue,
			simplified as JsonValue,
		) as SimplifiedStory;

		return {
			success: true,
			simplifiedStory,
		};
	} catch (error) {
		console.error('[TranslateAPI] Error simplifying story:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Map user-friendly reading level to CEFR language complexity level
 * - very-simple: A2 (elementary)
 * - simple: B1 (intermediate)
 * - normal: B2 (upper intermediate)
 */
function mapReadingLevel(readingLevel: ReadingLevel): 'a2' | 'b1' | 'b2' {
	switch (readingLevel) {
		case 'very-simple':
			return 'a2';
		case 'simple':
			return 'b1';
		case 'normal':
			return 'b2';
		default:
			return 'b1'; // Default to simple/intermediate
	}
}
