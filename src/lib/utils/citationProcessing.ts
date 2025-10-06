import { type CitationMapping, replaceWithNumberedCitations } from './citationContext';

/**
 * Hook for processing citations in text content
 */
export function useCitationProcessing(
	content: string | string[],
	citationMapping?: CitationMapping,
) {
	if (Array.isArray(content)) {
		// Process array of strings
		if (!citationMapping) return content;
		return content.map((item) => replaceWithNumberedCitations(item, citationMapping));
	} else {
		// Process single string
		if (!citationMapping) return content;
		return replaceWithNumberedCitations(content, citationMapping);
	}
}

/**
 * Hook for processing citation arrays with automatic mapping
 */
export function useCitationArray(items: string[], citationMapping?: CitationMapping): string[] {
	if (!citationMapping) return items;
	return items.map((item) => replaceWithNumberedCitations(item, citationMapping));
}
