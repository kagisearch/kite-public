/**
 * Device detection utilities
 */
import { browser } from '$app/environment';

/**
 * Check if the current device is mobile
 * Uses comprehensive detection including user agent, screen size, and touch capability
 */
export function isMobileDevice(): boolean {
	if (!browser) return false;

	const userAgent = navigator.userAgent.toLowerCase();
	const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
		userAgent,
	);
	const isSmallScreen = window.innerWidth <= 768;
	const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	return isMobileUA || (isSmallScreen && isTouchDevice);
}

/**
 * Check if the screen size is considered mobile (width <= 768px)
 * This is a simpler check that only considers screen width
 */
export function isMobileScreenSize(): boolean {
	if (!browser) return false;
	return window.innerWidth <= 768;
}

/**
 * Check if the device has touch capability
 */
export function isTouchDevice(): boolean {
	if (!browser) return false;
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
