import { isRtlLocale, resolveFieldDirection, resolveFieldLanguage } from './rtl-detection';
import { describe, expect, it } from 'vitest';

const RTL_TAGS = ['ar', 'he', 'fa', 'ur', 'ar-SA', 'he-IL'];
// Story content carries ISO 639-3 codes the hand-maintained list never had.
const RTL_ISO3_TAGS = ['arq', 'ary', 'arz', 'apc', 'ps', 'ug', 'ckb', 'sd'];
const LTR_TAGS = ['en', 'fr', 'de', 'ja', 'zh-Hans', 'ru', 'uk', 'et', 'hi'];
const SENTINELS = ['default', 'source', 'custom'];

describe('isRtlLocale', () => {
	it.each(RTL_TAGS)('detects %s', (locale) => {
		expect(isRtlLocale(locale)).toBe(true);
	});

	// Story content carries ISO 639-3 codes: Algeria arrives as `arq`, which the
	// hand-maintained list never had, so its Arabic rendered left-to-right
	// (KNEWS-453).
	it.each(RTL_ISO3_TAGS)('detects the ISO 639-3 code %s', (locale) => {
		expect(isRtlLocale(locale)).toBe(true);
	});

	it.each(LTR_TAGS)('leaves %s left-to-right', (locale) => {
		expect(isRtlLocale(locale)).toBe(false);
	});

	it('returns false for missing input', () => {
		expect(isRtlLocale(undefined)).toBe(false);
		expect(isRtlLocale(null)).toBe(false);
		expect(isRtlLocale('')).toBe(false);
	});

	it('falls back to the static list when Intl rejects the tag', () => {
		// `new Intl.Locale()` throws on these, so the base-language lookup runs
		expect(isRtlLocale('he_IL')).toBe(true);
		expect(isRtlLocale('ar_EG')).toBe(true);
		expect(isRtlLocale('not a locale')).toBe(false);
	});
});

describe('resolveFieldLanguage', () => {
	const he = { sourceLanguage: 'he', selectedLanguage: 'en' };

	it('uses the selected language when no translation is pending', () => {
		expect(resolveFieldLanguage({ ...he, needsTranslation: false })).toBe('en');
	});

	// Translation streams field by field, so each is judged on its own: one
	// section can already be English while the next is still Hebrew. Following
	// the target language for all of them rendered the undelivered ones
	// left-to-right (KNEWS-453 review).
	it('stays on the source language until the field itself arrives', () => {
		expect(resolveFieldLanguage({ ...he, needsTranslation: true, translated: false })).toBe('he');
		expect(resolveFieldLanguage({ ...he, needsTranslation: true })).toBe('he');
	});

	it('switches as soon as that field arrives', () => {
		expect(resolveFieldLanguage({ ...he, needsTranslation: true, translated: true })).toBe('en');
	});

	it('resolves each field independently mid-stream', () => {
		const base = { ...he, needsTranslation: true };
		expect(resolveFieldDirection({ ...base, translated: true })).toBe('ltr'); // delivered
		expect(resolveFieldDirection({ ...base, translated: false })).toBe('rtl'); // still Hebrew
	});

	// No dependence on the stream's overall state, so a stall or failure part
	// way through leaves every undelivered field correctly laid out.
	it('is unaffected by a stream that never completes', () => {
		const base = { ...he, needsTranslation: true };
		expect(resolveFieldDirection({ ...base, translated: false })).toBe('rtl');
	});

	it('handles the reverse direction too', () => {
		const en = { sourceLanguage: 'en', selectedLanguage: 'ar', needsTranslation: true };
		expect(resolveFieldDirection({ ...en, translated: false })).toBe('ltr');
		expect(resolveFieldDirection({ ...en, translated: true })).toBe('rtl');
	});

	it('falls back to the source language when nothing is selected', () => {
		expect(resolveFieldLanguage({ sourceLanguage: 'arq' })).toBe('arq');
		expect(resolveFieldDirection({ sourceLanguage: 'arq' })).toBe('rtl');
	});
});

describe('runtime and sentinel handling', () => {
	// Production serves SSR with Bun, whose JSC has no CLDR text-info entry for
	// these codes and answers 'ltr'. Script resolution agrees on both runtimes,
	// so this suite (Node) reflects what production renders (KNEWS-453 review).
	it.each(['arq', 'ary', 'arz', 'apc'])('detects %s via script, not text-info', (locale) => {
		expect(isRtlLocale(locale)).toBe(true);
	});

	// Urdu maximizes to Arab on Node and Aran on Bun; both are in RTL_SCRIPTS.
	it('resolves Urdu, whose script differs between runtimes', () => {
		expect(isRtlLocale('ur')).toBe(true);
	});

	// A positive script match short-circuits, but a negative one must fall
	// through to the list — otherwise the list is unreachable for anything Intl
	// can resolve, which is how `arc` regressed and `ydd`/`prs` split between
	// runtimes (Bun resolves no script for either).
	it.each(['arc', 'ydd', 'prs'])('falls through to the list for %s', (locale) => {
		expect(isRtlLocale(locale)).toBe(true);
	});

	// Modern Kurdish and Azerbaijani are Latin-script; their RTL variants have
	// their own codes.
	it.each(['ku', 'az'])('leaves %s left-to-right', (locale) => {
		expect(isRtlLocale(locale)).toBe(false);
	});

	it.each(['ckb', 'azb', 'sdh'])('detects the RTL variant %s', (locale) => {
		expect(isRtlLocale(locale)).toBe(true);
	});

	// 'default'/'source' are kite sentinels but structurally valid subtags, so
	// Intl resolves them to root instead of throwing — they must not shadow the
	// story's real source language.
	it.each(SENTINELS)('treats the %s sentinel as unset', (sentinel) => {
		expect(isRtlLocale(sentinel)).toBe(false);
		expect(resolveFieldLanguage({ sourceLanguage: 'he', selectedLanguage: sentinel })).toBe('he');
		expect(resolveFieldDirection({ sourceLanguage: 'arq', selectedLanguage: sentinel })).toBe(
			'rtl',
		);
	});
});
