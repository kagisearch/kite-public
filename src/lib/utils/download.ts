/**
 * Download content as a file in the browser
 */
export function downloadFile(
	content: string,
	filename: string,
	mimeType: string = 'text/csv;charset=utf-8;',
) {
	const blob = new Blob([content], { type: mimeType });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);

	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	// Clean up the URL object
	URL.revokeObjectURL(url);
}

/**
 * Convenience function for downloading CSV files
 */
export function downloadCSV(content: string, filename: string) {
	downloadFile(content, filename, 'text/csv;charset=utf-8;');
}
