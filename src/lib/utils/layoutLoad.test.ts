import locales from '$lib/locales';
import { buildBaseMetaTags, resolveLocaleStrings } from './layoutLoad';
import { describe, expect, it } from 'vitest';

const en = locales.en ?? {};
const de = locales.de ?? {};

describe('resolveLocaleStrings', () => {
	it('falls back to English', () => {
		const { primaryLocale, strings } = resolveLocaleStrings(null, null);
		expect(primaryLocale).toBe('en');
		expect(strings['meta.description']).toEqual(en['meta.description']);
	});

	it('uses Accept-Language, mapping Chinese regions to the script variants', () => {
		expect(resolveLocaleStrings(null, 'zh-TW,zh;q=0.9').primaryLocale).toBe('zh-Hant');
		expect(resolveLocaleStrings(null, 'zh-CN').primaryLocale).toBe('zh-Hans');
		expect(resolveLocaleStrings(null, 'de-DE,de;q=0.9,en;q=0.8').primaryLocale).toBe('de');
	});

	it('lets the explicit preference win over Accept-Language', () => {
		expect(resolveLocaleStrings('fr', 'de-DE').primaryLocale).toBe('fr');
	});

	it('ignores unknown locales', () => {
		expect(resolveLocaleStrings('xx', 'yy').primaryLocale).toBe('en');
	});

	it('keeps English strings underneath for keys a locale lacks', () => {
		const { strings } = resolveLocaleStrings('de', null);
		for (const key of Object.keys(en)) {
			expect(strings[key]).toBeDefined();
		}
	});
});

describe('buildBaseMetaTags', () => {
	it('builds canonical, Open Graph and Twitter tags from the URL', () => {
		const url = new URL('https://news.kagi.com/world/latest');
		const tags = buildBaseMetaTags(url, resolveLocaleStrings(null, null).strings);
		expect(tags.canonical).toBe(url.href);
		expect(tags.openGraph?.images?.[0]?.url).toBe('https://news.kagi.com/kite-banner.png');
		expect(tags.twitter?.image).toBe('https://news.kagi.com/kite-banner.png');
		expect(tags.description).toBe(en['meta.description']?.text);
	});

	it('localizes the description by data_lang', () => {
		const url = new URL('https://news.kagi.com/?data_lang=de');
		const tags = buildBaseMetaTags(url, resolveLocaleStrings(null, null).strings);
		expect(tags.description).toBe(de['meta.description']?.text);
	});
});
