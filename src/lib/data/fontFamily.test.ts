import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Each font option needs a @font-face, a class, and removal on switch-away —
// miss one and the option silently does nothing (KNEWS-452).
describe('font family options', () => {
	const css = readFileSync('src/app.css', 'utf-8');
	const settings = readFileSync('src/lib/data/settings.svelte.ts', 'utf-8');
	const ui = readFileSync('src/lib/components/settings/SettingsAppearance.svelte', 'utf-8');

	const options = ['atkinson', 'opendyslexic', 'fast'];

	it.each(options)('%s has a font-family class', (key) => {
		expect(css).toContain(`.font-family-${key}`);
	});

	// Scoped to applyFontFamily — the file also removes font-size classes.
	const applyFontFamily = settings.slice(settings.indexOf('function applyFontFamily'));
	const removal = applyFontFamily.match(/root\.classList\.remove\(([^)]*)\)/)?.[1] ?? '';

	it.each(options)('%s is cleared when switching away', (key) => {
		expect(removal).toContain(`font-family-${key}`);
	});

	it.each(options)('%s is offered in the settings UI', (key) => {
		expect(ui).toContain(`value: '${key}'`);
	});

	it('declares each family it references', () => {
		for (const family of ['Atkinson Hyperlegible Next', 'OpenDyslexic', 'Fast Sans']) {
			expect(css).toContain(`font-family: '${family}';`);
		}
	});

	it('points at font files that exist', () => {
		const urls = [...css.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map((m) => m[1]);
		expect(urls.length).toBeGreaterThan(0);
		for (const url of urls) {
			expect(() => readFileSync(`static${url}`)).not.toThrow();
		}
	});
});
