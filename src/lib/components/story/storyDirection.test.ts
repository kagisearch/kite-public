import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * dir="auto" resolves from an element's own first strong character and ignores
 * ancestors, so it silently discards the per-field direction the story sets.
 * That is what left "AP דיווחה…" rendering left-to-right (KNEWS-453).
 *
 * It is still right for text that is never translated and keeps its own script
 * — verbatim quotes, publisher names. Those opt out explicitly with a
 * `dir-auto-ok` comment, per element rather than per file, so adding one to a
 * component doesn't quietly exempt the rest of it.
 */
describe('story body direction', () => {
	const dir = 'src/lib/components/story';
	const files = readdirSync(dir).filter((f) => f.endsWith('.svelte'));

	/** Markup only — the script block discusses dir="auto" by name. */
	function markup(file: string): string {
		const source = readFileSync(`${dir}/${file}`, 'utf-8');
		return source.slice(source.lastIndexOf('</script>') + 1);
	}

	/** Occurrences not preceded by a dir-auto-ok marker within ~8 lines. */
	function unjustified(file: string): number {
		const body = markup(file);
		let count = 0;
		for (let i = body.indexOf('dir="auto"'); i !== -1; i = body.indexOf('dir="auto"', i + 1)) {
			if (!body.slice(Math.max(0, i - 500), i).includes('dir-auto-ok')) count++;
		}
		return count;
	}

	it.each(files)('%s justifies every dir="auto" it uses', (file) => {
		expect(unjustified(file)).toBe(0);
	});

	it('still has the deliberate cases, so nobody "fixes" them away', () => {
		for (const file of ['StoryQuote.svelte', 'StorySources.svelte', 'StoryPerspectives.svelte']) {
			expect(markup(file)).toContain('dir="auto"');
			expect(markup(file)).toContain('dir-auto-ok');
		}
	});
});

/**
 * A partial translation row ships some columns already in the target language
 * while `translationAvailable` stays false, so direction can't be decided from
 * the stream alone: the server names them in `preTranslatedFields` and the card
 * has to fold them in, or a translated title renders in the source language's
 * direction until the rest of the story arrives (KNEWS-455).
 */
describe('pre-translated fields', () => {
	const card = readFileSync('src/lib/components/story/StoryCard.svelte', 'utf-8');

	it('folds the server-named fields into the delivered set', () => {
		expect(card).toContain('story.preTranslatedFields');
		expect(card).toMatch(/hasTargetText\s*=[\s\S]{0,160}preTranslatedFields\.has\(field\)/);
	});

	// The two decisions that read "is this field in the target language yet".
	it('decides direction and pending state through that set', () => {
		expect(card).toContain('expected.every(hasTargetText)');
		expect(card).toContain('return !hasTargetText(field);');
		// hasTargetText is the only place that consults the stream for it; any
		// second reader would be a path where the seed doesn't apply.
		expect(card.match(/\bin translatedFields\b/g)).toHaveLength(1);
	});
});
