/**
 * Domain extraction and processing utilities
 */

/**
 * Extract domain from a URL
 * @param url - The URL to extract domain from
 * @returns The domain name or null if invalid
 */
export function extractDomainFromUrl(url: string): string | null {
	try {
		// Handle relative URLs or invalid inputs
		if (!url || typeof url !== 'string') {
			return null;
		}

		// Add protocol if missing
		let processedUrl = url;
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			processedUrl = `https://${url}`;
		}

		const urlObj = new URL(processedUrl);

		// Get hostname and remove www. prefix if present
		let domain = urlObj.hostname;
		if (domain.startsWith('www.')) {
			domain = domain.substring(4);
		}

		return domain;
	} catch (error) {
		console.debug('Failed to extract domain from URL:', url, error);
		return null;
	}
}

/**
 * Check if a domain is valid
 */
export function isValidDomain(domain: string): boolean {
	if (!domain || typeof domain !== 'string') {
		return false;
	}

	// Basic domain validation
	const domainRegex =
		/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
	return domainRegex.test(domain);
}

/**
 * Get a normalized domain name for comparison
 */
export function normalizeDomain(domain: string): string {
	if (!domain) return '';

	// Remove protocol if present
	let normalized = domain.replace(/^https?:\/\//, '');

	// Remove www. prefix
	normalized = normalized.replace(/^www\./, '');

	// Remove trailing slash
	normalized = normalized.replace(/\/$/, '');

	// Convert to lowercase
	return normalized.toLowerCase();
}
