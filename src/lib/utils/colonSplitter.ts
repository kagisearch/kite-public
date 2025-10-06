/**
 * Find the index of the first colon that is not part of a time format
 * Time formats are detected as patterns like "10:00", "23:59", etc.
 * @param text The text to search
 * @returns The index of the first non-time colon, or -1 if not found
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

	// Find the first colon that's not within a time pattern
	for (let i = 0; i < text.length; i++) {
		if (text[i] === ':') {
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
