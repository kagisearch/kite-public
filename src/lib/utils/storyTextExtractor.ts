/**
 * Utility to extract plain text from story sections for TTS
 * Strips citations and returns clean text
 */

import { stripCitations } from './citationUtils';

// Sections to skip (non-text content)
const SKIP_SECTIONS = new Set(['primaryImage', 'secondaryImage', 'sources']);

// Special case mappings for sections that don't follow the pattern
const SPECIAL_FIELD_MAP: Record<string, string> = {
	summary: 'short_summary',
	highlights: 'talking_points',
	quotes: 'quote',
	actionItems: 'user_action_items'
};

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Extract text from a value (string or array)
 */
function extractTextFromValue(value: any): string[] {
	if (!value) return [];

	// String value
	if (typeof value === 'string') {
		return [stripCitations(value)];
	}

	// Array of strings
	if (Array.isArray(value)) {
		return value
			.map((item) => {
				// Simple string items
				if (typeof item === 'string') {
					return stripCitations(item);
				}
				// Objects with specific fields
				if (typeof item === 'object' && item !== null) {
					// Timeline items
					if (item.event) {
						const text = `${item.date || ''} ${item.event}`.trim();
						return stripCitations(text);
					}
					// International reactions
					if (item.reaction) {
						const text = `${item.country || ''}: ${item.reaction}`.trim();
						return stripCitations(text);
					}
					// Perspectives
					if (item.perspective) {
						return stripCitations(item.perspective);
					}
					// Q&A
					if (item.question && item.answer) {
						return stripCitations(`${item.question} ${item.answer}`);
					}
				}
				return null;
			})
			.filter((text): text is string => text !== null);
	}

	return [];
}

/**
 * Extract text from a single section based on section ID
 */
function extractSectionText(sectionId: string, story: any): string[] {
	// Skip non-text sections
	if (SKIP_SECTIONS.has(sectionId)) {
		return [];
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
 * @returns Formatted text with section headers
 */
export function extractStoryText(story: any, enabledSections: Array<{ id: string; name?: string; label?: string }>): string {
	const textParts: string[] = [];

	// Always include title first
	textParts.push(stripCitations(story.title));

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
