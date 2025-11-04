/**
 * Generate Anki-compatible CSV content from vocabulary data
 * Format: front;back (semicolon-separated)
 */
export function generateAnkiCSV(vocabulary: Array<{ word: string; definition: string }>): string {
	const header = 'front;back';
	const rows = vocabulary.map((v) => `${v.word};${v.definition}`);
	return [header, ...rows].join('\n');
}
