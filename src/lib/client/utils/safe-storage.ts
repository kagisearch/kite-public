/**
 * Safe localStorage access utilities
 * These functions handle localStorage access gracefully when it's not available
 * (e.g., in private browsing mode or restricted environments)
 */

/**
 * Safely get an item from localStorage
 */
export function safeGetItem(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch (_e) {
		console.warn(`localStorage not available for key: ${key}`);
		return null;
	}
}

/**
 * Safely set an item in localStorage
 */
export function safeSetItem(key: string, value: string): boolean {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch (_e) {
		console.warn(`Could not save to localStorage: ${key}`);
		return false;
	}
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key: string): boolean {
	try {
		localStorage.removeItem(key);
		return true;
	} catch (_e) {
		console.warn(`Could not remove from localStorage: ${key}`);
		return false;
	}
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
	try {
		const testKey = '__localStorage_test__';
		localStorage.setItem(testKey, 'test');
		localStorage.removeItem(testKey);
		return true;
	} catch (_e) {
		return false;
	}
}
