/**
 * Language-agnostic sentence splitting utility
 * Uses heuristics to detect sentence boundaries while preserving abbreviations
 */

/**
 * Check if a character is likely an abbreviation period
 * @param text The full text
 * @param index The index of the period
 * @returns Whether this is likely an abbreviation
 */
function isAbbreviation(text: string, index: number): boolean {
	// First check: Is there another period close behind us?
	// This handles the middle of abbreviations like U.S. or E.U.
	let foundPeriodBehind = false;
	let charsBehind = 0;
	for (let i = index - 1; i >= index - 4 && i >= 0; i--) {
		if (text[i] === '.') {
			foundPeriodBehind = true;
			charsBehind = index - i;
			break;
		}
		// Stop looking if we hit a space
		if (text[i] === ' ') {
			break;
		}
	}

	if (foundPeriodBehind && charsBehind <= 2) {
		// We have a period 1-2 chars behind (like in U.S. or E.U.)
		// This is very likely an abbreviation, don't split here
		return true;
	}

	// Check if there's another period ahead (start of abbreviation like U.S.)
	for (let i = index + 1; i <= index + 4 && i < text.length; i++) {
		if (text[i] === '.') {
			return true; // Found another period close ahead - likely abbreviation
		}
		// Stop looking if we hit a space followed by uppercase (new sentence)
		if (text[i] === ' ' && i + 1 < text.length && /[A-Z]/.test(text[i + 1])) {
			break;
		}
	}

	// Check if it's a short word (1-3 letters) ending with period
	// This catches "Dr.", "Mr.", "Ms.", etc.
	if (index > 0) {
		// Find start of word
		let wordStart = index - 1;
		while (wordStart > 0 && /[A-Za-z]/.test(text[wordStart - 1])) {
			wordStart--;
		}

		const wordLength = index - wordStart;
		const word = text.substring(wordStart, index);

		// Common title abbreviations (Dr., Mr., Ms., Mrs., St., Jr., Sr., etc.)
		if (wordLength <= 3 && /^[A-Z]/.test(word)) {
			// Check what comes after
			const nextChar = text[index + 1];
			if (nextChar === ' ') {
				// Title followed by space - likely an abbreviation unless it's the end of text
				// or followed by something that clearly isn't a name
				if (index + 2 < text.length) {
					const afterSpace = text[index + 2];
					// If followed by capital letter, likely a title before a name
					if (/[A-Z]/.test(afterSpace)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}

/**
 * Split text into sentences using language-agnostic heuristics
 *
 * Rules:
 * 1. A period followed by a space and uppercase letter likely starts a new sentence
 * 2. A period followed by a space and a lowercase letter is likely an abbreviation
 * 3. Periods inside parentheses or quotes don't split sentences
 * 4. Multiple spaces or newlines indicate sentence boundaries
 * 5. Question marks and exclamation marks are always sentence endings
 * 6. Chinese/Japanese periods (。) are always sentence endings
 *
 * @param text The text to split
 * @returns Array of sentences
 */
export function splitSentences(text: string): string[] {
	if (!text) return [];

	const sentences: string[] = [];
	let currentSentence = '';
	let inParentheses = 0;
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const nextChar = text[i + 1];

		// Track parentheses depth
		if (char === '(') inParentheses++;
		if (char === ')') inParentheses--;

		// Track quotes (simple toggle for now)
		if (char === '"' || char === '"' || char === '"') inQuotes = !inQuotes;

		currentSentence += char;

		// Check for sentence boundaries
		if (!inQuotes && inParentheses === 0) {
			// Chinese/Japanese sentence ending
			if (char === '。') {
				sentences.push(currentSentence.trim());
				currentSentence = '';
				continue;
			}

			// Question marks and exclamation marks are always sentence endings
			if (
				(char === '?' || char === '!' || char === '？' || char === '！') &&
				(nextChar === ' ' || i === text.length - 1)
			) {
				sentences.push(currentSentence.trim());
				currentSentence = '';
				if (nextChar === ' ') i++; // Skip the space
				continue;
			}

			// Period handling - more complex due to abbreviations
			if (char === '.') {
				// Skip if this looks like an abbreviation
				if (isAbbreviation(text, i)) {
					continue;
				}

				// Check if followed by space and then uppercase letter or number
				// This indicates a likely sentence boundary
				if (nextChar === ' ') {
					// Check if next non-space character is uppercase or starts a number
					let j = i + 2;
					while (j < text.length && text[j] === ' ') j++;

					if (j < text.length) {
						const firstNonSpace = text[j];
						// Uppercase letter or digit likely starts new sentence
						// Also check for common sentence starters in various languages
						if (
							/[A-Z0-9\u00C0-\u00D6\u00D8-\u00DE\u0100-\u017F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(
								firstNonSpace,
							)
						) {
							sentences.push(currentSentence.trim());
							currentSentence = '';
							i++; // Skip the space
							continue;
						}
					}
				}

				// Check for end of text
				if (i === text.length - 1) {
					sentences.push(currentSentence.trim());
					currentSentence = '';
				}
			}
		}
	}

	// Add any remaining text as a sentence
	if (currentSentence.trim()) {
		sentences.push(currentSentence.trim());
	}

	return sentences.filter((s) => s.length > 0);
}

/**
 * Get the first sentence and the rest of the text
 * @param text The text to process
 * @returns Tuple of [firstSentence, restOfText]
 */
export function splitFirstSentence(text: string): [string, string] {
	if (!text) return ['', ''];

	// Find the first sentence boundary
	let inParentheses = 0;
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const nextChar = text[i + 1];

		// Track parentheses depth
		if (char === '(') inParentheses++;
		if (char === ')') inParentheses--;

		// Track quotes
		if (char === '"' || char === '"' || char === '"') inQuotes = !inQuotes;

		// Check for sentence boundaries
		if (!inQuotes && inParentheses === 0) {
			// Chinese/Japanese sentence ending
			if (char === '。') {
				const firstSentence = text.substring(0, i + 1).trim();
				const rest = text.substring(i + 1).trim();
				return [firstSentence, rest];
			}

			// Question marks and exclamation marks are always sentence endings
			if (
				(char === '?' || char === '!' || char === '？' || char === '！') &&
				(nextChar === ' ' || i === text.length - 1)
			) {
				const firstSentence = text.substring(0, i + 1).trim();
				const rest = text.substring(i + 1).trim();
				return [firstSentence, rest];
			}

			// Period handling
			if (char === '.') {
				// Skip if this looks like an abbreviation
				if (isAbbreviation(text, i)) {
					continue;
				}

				// End of text
				if (i === text.length - 1) {
					return [text, ''];
				}

				// Check if followed by space and uppercase
				if (nextChar === ' ') {
					// Find next non-space character
					let j = i + 2;
					while (j < text.length && text[j] === ' ') j++;

					if (j < text.length) {
						const firstNonSpace = text[j];
						// Check for uppercase (including non-Latin scripts)
						if (
							/[A-Z0-9\u00C0-\u00D6\u00D8-\u00DE\u0100-\u017F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(
								firstNonSpace,
							)
						) {
							const firstSentence = text.substring(0, i + 1).trim();
							const rest = text.substring(i + 1).trim();
							return [firstSentence, rest];
						}
					}
				}
			}
		}
	}

	// No sentence boundary found, return all as first sentence
	return [text, ''];
}
