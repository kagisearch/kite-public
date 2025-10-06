import { getContext } from 'svelte';
import type { MapsProvider } from '$lib/data/settings.svelte';

/**
 * Check if the user is logged into Kagi
 * Uses the session context from the layout
 */
export function isKagiLoggedIn(): boolean {
	try {
		// Try to get session from Svelte context
		const session = getContext<Session | null>('session');
		return session?.loggedIn === true;
	} catch {
		// Fallback: If not in a component context, return false
		return false;
	}
}

/**
 * Check if user is logged in using provided session
 */
export function isLoggedInWithSession(session: Session | null | undefined): boolean {
	return session?.loggedIn === true;
}

/**
 * Get the appropriate maps URL based on provider setting and location
 */
export function getMapsUrl(
	location: string,
	provider: MapsProvider,
	coordinates?: { lat: number; lon: number },
	session?: Session | null,
): string {
	// Clean up the location string
	const cleanLocation = location.trim();
	const encodedLocation = encodeURIComponent(cleanLocation);

	// If provider is auto, determine based on login status
	let actualProvider = provider;
	if (provider === 'auto') {
		// Use provided session if available, otherwise try to get from context
		const isLoggedIn = session ? isLoggedInWithSession(session) : isKagiLoggedIn();
		actualProvider = isLoggedIn ? 'kagi' : 'google';
	}

	// Generate URL based on provider
	switch (actualProvider) {
		case 'kagi':
			// Kagi Maps URL format
			if (coordinates) {
				return `https://kagi.com/maps?q=${coordinates.lat},${coordinates.lon}`;
			}
			return `https://kagi.com/maps?q=${encodedLocation}`;

		case 'google':
			// Google Maps URL format
			if (coordinates) {
				return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`;
			}
			return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

		case 'openstreetmap':
			// OpenStreetMap URL format
			if (coordinates) {
				return `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lon}&zoom=12`;
			}
			return `https://www.openstreetmap.org/search?query=${encodedLocation}`;

		case 'apple':
			// Apple Maps URL format (works on all devices, opens in browser or native app)
			if (coordinates) {
				return `https://maps.apple.com/?ll=${coordinates.lat},${coordinates.lon}&z=12`;
			}
			return `https://maps.apple.com/?q=${encodedLocation}`;

		default:
			// Fallback to Google Maps
			if (coordinates) {
				return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`;
			}
			return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
	}
}

/**
 * Get display name for a maps provider
 */
export function getMapsProviderDisplayName(
	provider: MapsProvider,
	session?: Session | null,
): string {
	switch (provider) {
		case 'auto': {
			const isLoggedIn = session ? isLoggedInWithSession(session) : isKagiLoggedIn();
			return isLoggedIn ? 'Kagi Maps (auto)' : 'Google Maps (auto)';
		}
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
