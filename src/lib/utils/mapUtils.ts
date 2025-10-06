/**
 * Utility functions for handling map URLs and device detection
 */

import { displaySettings } from '$lib/data/settings.svelte';
import { getMapsUrl } from './mapsProvider';

/**
 * Detects if the current device is an Apple device
 */
export function isAppleDevice(): boolean {
	if (typeof navigator === 'undefined') return false;

	const userAgent = navigator.userAgent.toLowerCase();

	// Check for iOS devices
	const isIOS =
		/iphone|ipad|ipod/.test(userAgent) ||
		// iPad on iOS 13+ with desktop mode
		(navigator.maxTouchPoints > 1 && /macintosh/.test(userAgent));

	// Check for macOS
	const isMacOS = /macintosh|mac os x/.test(userAgent) && navigator.maxTouchPoints === 0;

	return isIOS || isMacOS;
}

/**
 * Detects if the current device is iOS specifically
 */
export function isIOSDevice(): boolean {
	if (typeof navigator === 'undefined') return false;

	const userAgent = navigator.userAgent.toLowerCase();

	return (
		/iphone|ipad|ipod/.test(userAgent) ||
		// iPad on iOS 13+ with desktop mode
		(navigator.maxTouchPoints > 1 && /macintosh/.test(userAgent))
	);
}

/**
 * Opens the appropriate map service based on the user's settings and location
 */
export function openMapLocation(
	location: string,
	coordinates?: { lat: number; lon: number },
	session?: Session | null,
): void {
	if (!location) return;

	// Get the maps URL based on user's provider setting
	const mapUrl = getMapsUrl(location, displaySettings.mapsProvider, coordinates, session);

	// Special handling for Apple devices with Apple Maps selected
	if (displaySettings.mapsProvider === 'apple' && isIOSDevice()) {
		// For iOS devices, try to use the native maps:// protocol first
		const encodedLocation = encodeURIComponent(location);
		const nativeUrl = coordinates
			? `maps://maps.apple.com/?ll=${coordinates.lat},${coordinates.lon}&z=12`
			: `maps://maps.apple.com/?q=${encodedLocation}`;

		// Create a temporary link and click it to trigger the protocol
		const link = document.createElement('a');
		link.href = nativeUrl;
		link.style.display = 'none';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Fallback to web URL after a short delay if native app doesn't open
		setTimeout(() => {
			if (document.hasFocus()) {
				// If we still have focus, the app probably didn't open
				window.open(mapUrl, '_blank');
			}
		}, 500);
	} else {
		// For all other cases, open the web URL directly
		window.open(mapUrl, '_blank');
	}
}

/**
 * Gets the appropriate map service name based on user settings
 */
export function getMapServiceName(): string {
	const provider = displaySettings.mapsProvider;

	switch (provider) {
		case 'auto':
			// This will be determined dynamically
			return 'Maps';
		case 'kagi':
			return 'Kagi Maps';
		case 'google':
			return 'Google Maps';
		case 'openstreetmap':
			return 'OpenStreetMap';
		case 'apple':
			return 'Apple Maps';
		default:
			return 'Maps';
	}
}
