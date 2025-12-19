import { describe, it, expect } from 'vitest';

// Test the parseText regex functionality
function parseText(text: string): Array<{ type: 'word' | 'other'; content: string }> {
	const parts: Array<{ type: 'word' | 'other'; content: string }> = [];
	// Match words with Unicode letters, hyphens, and apostrophes
	// \p{L} matches any Unicode letter (including accented characters)
	const regex = /([\p{L}]+(?:[-'][\p{L}]+)*)|([^\p{L}]+)/gu;

	let match;
	while ((match = regex.exec(text)) !== null) {
		if (match[1]) {
			// It's a word (possibly with hyphens)
			parts.push({ type: 'word', content: match[1] });
		} else if (match[2]) {
			// It's punctuation/whitespace
			parts.push({ type: 'other', content: match[2] });
		}
	}

	return parts;
}

describe('SelectableText parseText', () => {
	it('should parse English text correctly', () => {
		const result = parseText('Hello world');
		expect(result).toEqual([
			{ type: 'word', content: 'Hello' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'world' },
		]);
	});

	it('should parse French accented characters', () => {
		const result = parseText('Assemblée adopte nouvel impôt');
		expect(result).toEqual([
			{ type: 'word', content: 'Assemblée' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'adopte' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'nouvel' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'impôt' },
		]);
	});

	it('should parse words with accents', () => {
		const result = parseText('café naïve résumé');
		expect(result).toEqual([
			{ type: 'word', content: 'café' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'naïve' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'résumé' },
		]);
	});

	it('should handle hyphened words', () => {
		const result = parseText('self-control');
		expect(result).toEqual([{ type: 'word', content: 'self-control' }]);
	});

	it('should handle apostrophes', () => {
		const result = parseText("don't");
		expect(result).toEqual([{ type: 'word', content: "don't" }]);
	});

	it('should handle German umlauts', () => {
		const result = parseText('über schön');
		expect(result).toEqual([
			{ type: 'word', content: 'über' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'schön' },
		]);
	});

	it('should handle Spanish tildes', () => {
		const result = parseText('español niño');
		expect(result).toEqual([
			{ type: 'word', content: 'español' },
			{ type: 'other', content: ' ' },
			{ type: 'word', content: 'niño' },
		]);
	});

	it('should handle Portuguese cedilla', () => {
		const result = parseText('educação');
		expect(result).toEqual([{ type: 'word', content: 'educação' }]);
	});
});
