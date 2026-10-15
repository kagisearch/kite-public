// Pure parts of the root layout load, shared by the private
// src/routes/+layout.server.ts and the public repo's version
// (utilities/templates/public-overrides).
import locales from '$lib/locales';
import { getLocaleFromDataLang } from '$lib/utils/languageMapping';
import parser from 'accept-language-parser';
import type { MetaTagsProps } from 'svelte-meta-tags';

export type LocaleStrings = Record<string, { text: string; translationContext: string }>;

// Map common Chinese locale codes to our available zh-Hans/zh-Hant
function mapLocale(locale: string): string {
	const chineseMapping: Record<string, string> = {
		zh: 'zh-Hans', // Default Chinese to Simplified
		zh_cn: 'zh-Hans', // China uses Simplified
		zh_sg: 'zh-Hans', // Singapore uses Simplified
		zh_tw: 'zh-Hant', // Taiwan uses Traditional
		zh_hk: 'zh-Hant', // Hong Kong uses Traditional
		zh_mo: 'zh-Hant', // Macau uses Traditional
	};
	return chineseMapping[locale.toLowerCase()] || locale;
}

/**
 * UI strings for the request: English, overlaid by Accept-Language matches,
 * overlaid by the explicit preference (locale cookie or account language).
 */
export function resolveLocaleStrings(
	preferredLocale: string | null | undefined,
	acceptLanguage: string | null,
): { primaryLocale: string | undefined; strings: LocaleStrings } {
	const candidateLocales = [
		preferredLocale || null,
		...parser.parse(acceptLanguage || 'en').map(({ code, region }) => {
			const locale = `${code}${region ? `_${region?.toLowerCase()}` : ''}`;
			return mapLocale(locale);
		}),
		'en',
	].reverse();

	let strings: LocaleStrings = {};
	let primaryLocale: string | undefined;

	for (const locale of candidateLocales) {
		if (locale && locales[locale]) {
			primaryLocale = locale;
			strings = { ...strings, ...locales[locale] };
		}
	}

	return { primaryLocale, strings };
}

/** Meta tags that apply to every page, localized by ?data_lang when present. */
export function buildBaseMetaTags(url: URL, strings: LocaleStrings): MetaTagsProps {
	// Get data_lang from URL if present, to determine which locale to use for meta tags
	const dataLang = url.searchParams.get('data_lang');
	let metaStrings = strings; // Use the detected locale strings by default

	// If data_lang is specified and we have that locale, use it for meta tags
	const targetLocale = getLocaleFromDataLang(dataLang);
	if (targetLocale && locales[targetLocale]) {
		metaStrings = locales[targetLocale];
	}

	// Get localized meta description, fallback to English if not found
	const metaDescription =
		metaStrings['meta.description']?.text ||
		strings['meta.description']?.text ||
		'Kagi News distills thousands of world-wide news sources into one perfect daily briefing. Get every critical perspective in just 5 minutes. No endless scrolling. No attention hijacking.';

	return {
		title: 'Kagi News',
		titleTemplate: '%s | Kagi News',
		description: metaDescription,
		canonical: url.href,
		openGraph: {
			type: 'website',
			url: url.href,
			locale: 'en_US',
			title: 'Kagi News',
			description: metaDescription,
			siteName: 'Kagi News',
			images: [
				{
					url: `${url.origin}/kite-banner.png`,
					alt: 'Kagi News',
					width: 1200,
					height: 630,
					type: 'image/png',
				},
			],
		},
		twitter: {
			cardType: 'summary_large_image',
			title: 'Kagi News',
			description: metaDescription,
			image: `${url.origin}/kite-banner.png`,
			imageAlt: 'Kagi News',
		},
		additionalMetaTags: [
			{
				name: 'apple-itunes-app',
				content: 'app-id=6748314243',
			},
		],
	};
}
