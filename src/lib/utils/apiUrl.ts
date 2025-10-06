import { browser } from '$app/environment';

/**
 * Get the base URL for API calls
 * In browser, uses relative URLs
 * In tests, uses full URLs with localhost
 */
export function getApiBaseUrl(): string {
	// In browser, use relative URLs
	if (browser) {
		return '/api';
	}

	// In Node/tests, use full URL
	if (process?.env.VITE_API_BASE_URL) {
		return `${process.env.VITE_API_BASE_URL}/api`;
	}

	// Fallback to localhost
	return 'http://localhost:5173/api';
}
