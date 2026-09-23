import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * HTML comments do not nest: the first `-->` closes the comment, and any text
 * after it — including a stray `-->` — renders as visible page content. A
 * nested `<!--` in a Svelte template is therefore a guaranteed leak. This bit
 * us on the story quote card, where a `dir-auto-ok` marker comment was wrapped
 * inside an explanatory one and the tail leaked onto news.kagi.com (KNEWS-462).
 *
 * This guard scans every component's markup (script/style blocks stripped, so a
 * `<!--` inside a JS string doesn't count) and fails on a nested or unclosed
 * comment.
 */
function svelteFiles(root: string): string[] {
	return readdirSync(root, { recursive: true, encoding: 'utf-8' })
		.filter((f) => f.endsWith('.svelte'))
		.map((f) => `${root}/${f}`);
}

/** Strip <script>…</script> and <style>…</style> so only real markup remains. */
function markup(source: string): string {
	return source
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

/** Returns a human-readable problem description, or null if comments are sound. */
function findCommentLeak(source: string): string | null {
	const body = markup(source);
	const lineAt = (idx: number) => body.slice(0, idx).split('\n').length;

	let i = 0;
	while (i < body.length) {
		const open = body.indexOf('<!--', i);
		if (open === -1) return null;

		const close = body.indexOf('-->', open + 4);
		if (close === -1) return `unclosed comment opened at line ${lineAt(open)}`;

		const nested = body.indexOf('<!--', open + 4);
		if (nested !== -1 && nested < close) {
			return `nested <!-- at line ${lineAt(nested)} inside comment opened at line ${lineAt(open)} (closes early at line ${lineAt(close)}) — text after it leaks to the page`;
		}
		i = close + 3;
	}
	return null;
}

describe('svelte comment hygiene', () => {
	const files = svelteFiles('src');

	it('finds .svelte files to check', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it.each(files)('%s has no nested/unclosed HTML comment', (file) => {
		const leak = findCommentLeak(readFileSync(file, 'utf-8'));
		expect(leak, `${file}: ${leak}`).toBeNull();
	});
});
