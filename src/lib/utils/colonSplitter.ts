/**
 * Find the index of the first colon that is not part of a time format
 * and is not inside quoted text (single/double quotes, Japanese brackets, etc.)
 * Time formats are detected as patterns like "10:00", "23:59", etc.
 * @param text The text to search
 * @returns The index of the first non-time colon outside quotes, or -1 if not found
 */
export function findNonTimeColon(text: string): number {
	// Regular expression to match time patterns (HH:MM with optional seconds)
	const timePattern = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

	// Find all time patterns in the text
	const timeMatches: Array<{ start: number; end: number }> = [];
	let match: RegExpExecArray | null = timePattern.exec(text);
	while (match !== null) {
		timeMatches.push({
			start: match.index,
			end: match.index + match[0].length,
		});
		match = timePattern.exec(text);
	}

	// Quote pairs to track (opening -> closing)
	// Includes: single quotes, double quotes, curly quotes, Japanese brackets, guillemets
	const quotePairs: Record<string, string> = {
		"'": "'", // straight single quote (self-closing)
		'"': '"', // straight double quote (self-closing)
		'\u2018': '\u2019', // curly single quotes: ' → '
		'\u201C': '\u201D', // curly double quotes: " → "
		'「': '」', // Japanese corner brackets
		'『': '』', // Japanese double corner brackets
		'«': '»', // guillemets
		'‹': '›', // single guillemets
	};

	// Track quote depth for each quote type
	const quoteStack: string[] = [];

	// Find the first colon that's not within a time pattern and not inside quotes
	for (let i = 0; i < text.length; i++) {
		const char = text[i];

		// Check if this is a closing quote for the current context
		if (quoteStack.length > 0 && char === quoteStack[quoteStack.length - 1]) {
			quoteStack.pop();
			continue;
		}

		// Check if this is an opening quote
		if (char in quotePairs) {
			quoteStack.push(quotePairs[char]);
			continue;
		}

		// Only consider colons when not inside any quotes
		if (char === ':' && quoteStack.length === 0) {
			// Check if this colon is part of a time pattern
			const isPartOfTime = timeMatches.some(
				(timeMatch) => i >= timeMatch.start && i < timeMatch.end,
			);

			if (!isPartOfTime) {
				return i;
			}
		}
	}

	return -1;
}

/**
 * Split text at the first colon that is not part of a time format
 * and is not inside quoted text (single/double quotes, Japanese brackets, etc.)
 * @param text The text to split
 * @returns A tuple of [before, after] or null if no valid split point found
 */
export function splitAtNonTimeColon(text: string): [string, string] | null {
	const colonIndex = findNonTimeColon(text);
	if (colonIndex !== -1) {
		return [text.substring(0, colonIndex).trim(), text.substring(colonIndex + 1).trim()];
	}
	return null;
}
