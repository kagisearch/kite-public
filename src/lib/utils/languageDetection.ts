import { SUPPORTED_LANGUAGES } from '$lib/constants/languages';
import type { SupportedLanguage } from '$lib/data/settings.svelte';

/**
 * Detects the user's preferred language from browser settings
 * and returns a supported language or "default" if not supported
 */
export function detectUserLanguage(): SupportedLanguage {
	if (typeof navigator === 'undefined') return 'default';

	const browserLang = navigator.language;

	// Get all supported language codes (excluding "default")
	const supportedCodes = SUPPORTED_LANGUAGES.filter((lang) => lang.code !== 'default').map(
		(lang) => lang.code,
	);

	// First try exact match (e.g., "pt-BR", "zh-Hans")
	if (supportedCodes.includes(browserLang)) {
		return browserLang as SupportedLanguage;
	}

	// Then try base language code (e.g., "pt" from "pt-PT")
	const baseLang = browserLang.split('-')[0];
	if (supportedCodes.includes(baseLang)) {
		return baseLang as SupportedLanguage;
	}

	// Special handling for Chinese variants
	if (baseLang === 'zh') {
		return detectChineseVariant(browserLang);
	}

	// Fall back to default if not supported
	return 'default';
}

/**
 * Determines the appropriate Chinese variant based on region
 */
export function detectChineseVariant(browserLang: string): SupportedLanguage {
	const region = browserLang.split('-')[1];

	// Traditional Chinese regions
	if (region && ['TW', 'HK', 'MO'].includes(region.toUpperCase())) {
		return 'zh-Hant';
	}

	// Default to simplified for mainland China and others
	return 'zh-Hans';
}

/**
 * Checks if a language is supported
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
	return SUPPORTED_LANGUAGES.some((supported) => supported.code === lang);
}
