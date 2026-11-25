import { afterAll, beforeAll } from 'vitest';

// Store the original fetch
const originalFetch = global.fetch;

// Setup for integration tests
beforeAll(() => {
	// Override fetch to add the base URL for integration tests
	global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		let url: string;

		if (typeof input === 'string') {
			// If it's a relative URL starting with /api, prepend the base URL
			if (input.startsWith('/api')) {
				url = `http://localhost:5173${input}`;
			} else {
				url = input;
			}
		} else if (input instanceof URL) {
			url = input.toString();
		} else {
			// For Request objects
			url = input.url;
		}

		return originalFetch(url, init);
	};
});

afterAll(() => {
	// Restore original fetch
	global.fetch = originalFetch;
});
