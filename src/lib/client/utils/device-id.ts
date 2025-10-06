/**
 * Device ID management utilities
 */

import { v4 as uuidv4 } from 'uuid';
import { browser } from '$app/environment';
import { safeGetItem, safeSetItem } from './safe-storage';

/**
 * Get or create a persistent device ID
 * This is called on app initialization to ensure we always have a device ID
 */
export function getOrCreateDeviceId(): string {
	if (!browser) return '';

	let deviceId = safeGetItem('deviceId');
	if (!deviceId) {
		deviceId = uuidv4();
		if (!safeSetItem('deviceId', deviceId)) {
			// If we couldn't save, return a temporary ID
			console.warn('Could not persist device ID, using temporary ID');
			return `temp-${deviceId}`;
		}
	}
	return deviceId;
}

/**
 * Get the current device ID (assumes it exists)
 */
export function getDeviceId(): string {
	if (!browser) return '';
	return safeGetItem('deviceId') || '';
}

/**
 * Initialize device ID on app startup
 * This should be called in the root layout
 */
export function initializeDeviceId(): void {
	if (browser) {
		getOrCreateDeviceId();
	}
}
