/**
 * Utility to extract plain text from story sections for TTS
 * Strips citations and returns clean text optimized for natural speech
 */

import { stripCitations } from './citationUtils';

// Sections to skip (non-text content)
const SKIP_SECTIONS = new Set(['primaryImage', 'secondaryImage', 'sources']);

// Special case mappings for sections that don't follow the pattern
// Note: businessAngle and quotes are handled specially in extractSectionText
const SPECIAL_FIELD_MAP: Record<string, string> = {
	summary: 'short_summary',
	highlights: 'talking_points',
	actionItems: 'user_action_items',
	suggestedQnA: 'suggested_qna', // camelToSnake produces 'suggested_qn_a' which is wrong
};

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Type for story field values - use unknown for flexibility with external data
type StoryFieldValue = unknown;

// Type guard for object items
function isRecordWithString(
	item: unknown,
	key: string,
): item is Record<string, string | undefined> {
	return (
		typeof item === 'object' &&
		item !== null &&
		key in item &&
		typeof (item as Record<string, unknown>)[key] === 'string'
	);
}

/**
 * Extract text from a value (string or array)
 */
function extractTextFromValue(value: StoryFieldValue): string[] {
	if (!value) return [];

	// String value
	if (typeof value === 'string') {
		return [stripCitations(value)];
	}

	// Array of items
	if (Array.isArray(value)) {
		return value
			.map((item) => {
				// Simple string items
				if (typeof item === 'string') {
					return stripCitations(item);
				}
				// Objects with specific fields
				if (typeof item === 'object' && item !== null) {
					const obj = item as Record<string, string | undefined>;
					// Timeline items (have 'date' and 'content' fields)
					if (isRecordWithString(item, 'content') && isRecordWithString(item, 'date')) {
						const text = `${obj.date || ''} ${obj.content}`.trim();
						return stripCitations(text);
					}
					// Perspectives (have 'text' field and 'sources' array)
					if (isRecordWithString(item, 'text') && 'sources' in item) {
						return stripCitations(obj.text || '');
					}
					// Q&A
					if (isRecordWithString(item, 'question') && isRecordWithString(item, 'answer')) {
						return stripCitations(`${obj.question} ${obj.answer}`);
					}
				}
				return null;
			})
			.filter((text): text is string => text !== null);
	}

	return [];
}

// Story type for text extraction
type StoryData = Record<string, unknown>;

/**
 * Extract text from a single section based on section ID
 */
function extractSectionText(sectionId: string, story: StoryData): string[] {
	// Skip non-text sections
	if (SKIP_SECTIONS.has(sectionId)) {
		return [];
	}

	// Special case: businessAngle has both text and points fields
	if (sectionId === 'businessAngle') {
		const results: string[] = [];
		const text = story['business_angle_text'];
		const points = story['business_angle_points'];
		if (typeof text === 'string') {
			results.push(stripCitations(text));
		}
		if (Array.isArray(points)) {
			results.push(...extractTextFromValue(points));
		}
		return results;
	}

	// Special case: quotes - include author/attribution for natural speech
	if (sectionId === 'quotes') {
		const quote = story['quote'];
		if (typeof quote !== 'string') return [];

		let text = stripCitations(quote);
		const author = story['quote_author'];
		const attribution = story['quote_attribution'];
		if (typeof author === 'string' && author) {
			text += `, ${author}`;
			if (typeof attribution === 'string' && attribution) {
				text += `, ${attribution}`;
			}
		}
		return [text];
	}

	// Get field name - check special cases first, then convert camelCase to snake_case
	const fieldName = SPECIAL_FIELD_MAP[sectionId] || camelToSnake(sectionId);

	// Get value and extract text
	const value = story[fieldName];
	return extractTextFromValue(value);
}

/**
 * Extract all text from a story following user's section order
 * @param story - The story object
 * @param enabledSections - Ordered list of enabled sections
 * @returns Formatted text optimized for natural TTS reading
 */
export function extractStoryText(
	story: StoryData,
	enabledSections: Array<{ id: string; name?: string; label?: string }>,
): string {
	const textParts: string[] = [];

	// Always include title first
	const title = story.title;
	if (typeof title === 'string') {
		textParts.push(stripCitations(title));
	}

	// Process each enabled section in order
	for (const section of enabledSections) {
		const sectionContent = extractSectionText(section.id, story);

		// Add section with header if it has content and a name/label
		const sectionName = section.label || section.name;
		if (sectionContent.length > 0 && sectionName) {
			textParts.push(`${sectionName}. ${sectionContent.join('. ')}`);
		}
	}

	// Normalize spacing: replace multiple spaces/periods with single ones
	return textParts.join('. ').replace(/\s+/g, ' ').replace(/\.+/g, '.').trim();
}
