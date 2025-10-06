/**
 * Citation parsing and formatting utilities
 */

export interface Citation {
	id: string;
	domain: string;
	articleId: string;
	fullText: string;
	number?: number; // For numbered citations like [1], [2], etc.
}

export interface ParsedTextSegment {
	type: 'text' | 'citation';
	content: string;
	citation?: Citation;
}

/**
 * Parse text and extract citations in format [domain#position]
 */
export function parseTextWithCitations(text: string): ParsedTextSegment[] {
	if (!text) return [];

	// Pattern to match citations like [reuters#1], [nytimes#2], [common], etc.
	const citationPattern = /\[([^\]]+)\]/g;

	const segments: ParsedTextSegment[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = citationPattern.exec(text);

	while (match !== null) {
		// Add text before citation
		if (match.index > lastIndex) {
			segments.push({
				type: 'text',
				content: text.slice(lastIndex, match.index),
			});
		}

		// Parse citation
		const fullText = match[0];
		const citationContent = match[1];

		// Check if it's a domain#position format
		const domainMatch = citationContent.match(/^([^#]+)#(\d+)$/);
		if (domainMatch) {
			segments.push({
				type: 'citation',
				content: citationContent,
				citation: {
					id: citationContent,
					domain: domainMatch[1],
					articleId: domainMatch[2], // This is now the position within domain
					fullText,
				},
			});
		} else {
			// Handle special cases like [common]
			segments.push({
				type: 'citation',
				content: citationContent,
				citation: {
					id: citationContent,
					domain: citationContent,
					articleId: '',
					fullText,
				},
			});
		}

		lastIndex = match.index + match[0].length;
		match = citationPattern.exec(text);
	}

	// Add remaining text
	if (lastIndex < text.length) {
		segments.push({
			type: 'text',
			content: text.slice(lastIndex),
		});
	}

	return segments;
}

/**
 * Format citations as numbered references [1], [2], etc.
 */
export function formatCitationsAsNumbers(segments: ParsedTextSegment[]): {
	formattedSegments: ParsedTextSegment[];
	citations: Citation[];
} {
	const citations: Citation[] = [];
	const citationMap = new Map<string, number>();

	const formattedSegments = segments.map((segment) => {
		if (segment.type === 'citation' && segment.citation) {
			const citationId = segment.citation.id;

			// Check if we've seen this citation before
			if (!citationMap.has(citationId)) {
				citations.push(segment.citation);
				citationMap.set(citationId, citations.length);
			}

			const citationNumber = citationMap.get(citationId)!;

			return {
				...segment,
				content: `[${citationNumber}]`,
			};
		}
		return segment;
	});

	return { formattedSegments, citations };
}

/**
 * Extract unique domains from citations
 */
export function extractDomainsFromCitations(citations: Citation[]): string[] {
	const domains = new Set<string>();

	citations.forEach((citation) => {
		if (citation.domain && citation.domain !== 'common') {
			domains.add(citation.domain);
		}
	});

	return Array.from(domains);
}

/**
 * Get favicon URL for a domain
 * Uses our unified favicon proxy service
 */
export function getFaviconUrl(domain: string): string {
	// Use our favicon proxy for high quality favicons (256x256)
	// This provides much sharper icons when displayed at smaller sizes
	return `/api/favicon-proxy?domain=${encodeURIComponent(domain)}&quality=high`;
}

/**
 * Remove all citations from text
 */
export function stripCitations(text: string): string {
	if (!text || typeof text !== 'string') return '';

	// Pattern to match citations like [domain#position], [common], [*], [1], [2], etc.
	const citationPattern = /\[([^\]]+)\]/g;

	// Remove citations and clean up extra spaces
	let cleaned = text.replace(citationPattern, '').trim();
	cleaned = cleaned.replace(/\s+/g, ' '); // Replace multiple spaces with single space
	cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1'); // Fix space before punctuation

	return cleaned;
}
