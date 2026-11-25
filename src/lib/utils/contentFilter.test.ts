import type { Perspective, Story } from '$lib/types';
import { shouldFilterStory, filterStories } from './contentFilter';
import { describe, it, expect } from 'vitest';

// Helper to create a minimal story for testing
function createStory(overrides: Partial<Story> = {}): Story {
	return {
		id: 'test-story-1',
		title: 'Test Story Title',
		headline: 'Test headline',
		short_summary: 'A short summary of the story',
		quote: 'A quote',
		quote_author: 'Author',
		quote_source: 'Source',
		quote_source_url: 'https://example.com',
		location: 'New York',
		emoji: '📰',
		category: 'Technology',
		international_relevance: 5,
		perspectives: [],
		domains: [],
		articles: [],
		...overrides,
	} as Story;
}

describe('shouldFilterStory', () => {
	describe('keywords ending with periods (like "u.s.")', () => {
		it('should filter "U.S." in title when keyword is "u.s."', () => {
			const story = createStory({
				title: 'OpenAI to test ads in ChatGPT for U.S. adults',
			});
			const result = shouldFilterStory(story, ['u.s.'], 'title');
			expect(result.shouldFilter).toBe(true);
			expect(result.matchedKeywords).toContain('u.s.');
		});

		it('should filter "U.S." at end of title', () => {
			const story = createStory({
				title: 'New policies affecting the U.S.',
			});
			const result = shouldFilterStory(story, ['u.s.'], 'title');
			expect(result.shouldFilter).toBe(true);
		});

		it('should filter "U.S." at start of title', () => {
			const story = createStory({
				title: 'U.S. economy grows',
			});
			const result = shouldFilterStory(story, ['u.s.'], 'title');
			expect(result.shouldFilter).toBe(true);
		});

		it('should NOT filter "U.S.A." when keyword is "u.s."', () => {
			const story = createStory({
				title: 'U.S.A. wins gold medal',
			});
			const result = shouldFilterStory(story, ['u.s.'], 'title');
			expect(result.shouldFilter).toBe(false);
		});

		it('should handle "u.s." stored in lowercase matching uppercase in text', () => {
			const story = createStory({
				title: 'The U.S. President speaks',
			});
			// Keywords are always stored lowercase
			const result = shouldFilterStory(story, ['u.s.'], 'title');
			expect(result.shouldFilter).toBe(true);
		});
	});

	describe('regular word keywords', () => {
		it('should filter exact word match', () => {
			const story = createStory({
				title: 'Trump wins election',
			});
			const result = shouldFilterStory(story, ['trump'], 'title');
			expect(result.shouldFilter).toBe(true);
		});

		it('should NOT filter partial word match', () => {
			const story = createStory({
				title: 'Trumpian policies discussed',
			});
			const result = shouldFilterStory(story, ['trump'], 'title');
			expect(result.shouldFilter).toBe(false);
		});

		it('should be case-insensitive', () => {
			const story = createStory({
				title: 'BREAKING: Major news event',
			});
			const result = shouldFilterStory(story, ['breaking'], 'title');
			expect(result.shouldFilter).toBe(true);
		});
	});

	describe('keywords starting with special characters', () => {
		it('should filter ".net" in text', () => {
			const story = createStory({
				title: 'Learn .NET programming today',
			});
			const result = shouldFilterStory(story, ['.net'], 'title');
			expect(result.shouldFilter).toBe(true);
		});

		it('should filter ".net" at start of text', () => {
			const story = createStory({
				title: '.NET framework released',
			});
			const result = shouldFilterStory(story, ['.net'], 'title');
			expect(result.shouldFilter).toBe(true);
		});
	});

	describe('filter scope', () => {
		it('should filter by title only when scope is "title"', () => {
			const story = createStory({
				title: 'Neutral headline',
				short_summary: 'This mentions U.S. policy',
			});
			const result = shouldFilterStory(story, ['u.s.'], 'title');
			expect(result.shouldFilter).toBe(false);
		});

		it('should filter by summary when scope is "summary"', () => {
			const story = createStory({
				title: 'Neutral headline',
				short_summary: 'This mentions U.S. policy',
			});
			const result = shouldFilterStory(story, ['u.s.'], 'summary');
			expect(result.shouldFilter).toBe(true);
		});

		it('should filter by all content when scope is "all"', () => {
			const story = createStory({
				title: 'Neutral headline',
				short_summary: 'Neutral summary',
				perspectives: [{ text: 'U.S. perspective here', sources: [] }],
			});
			const result = shouldFilterStory(story, ['u.s.'], 'all');
			expect(result.shouldFilter).toBe(true);
		});

		it('should also check category field when scope is "title"', () => {
			const story = createStory({
				title: 'Some headline',
				category: 'U.S. Politics',
			});
			const result = shouldFilterStory(story, ['u.s.'], 'title');
			expect(result.shouldFilter).toBe(true);
		});
	});

	describe('multiple keywords', () => {
		it('should return all matched keywords', () => {
			const story = createStory({
				title: 'U.S. and China trade talks',
			});
			const result = shouldFilterStory(story, ['u.s.', 'china'], 'title');
			expect(result.shouldFilter).toBe(true);
			expect(result.matchedKeywords).toContain('u.s.');
			expect(result.matchedKeywords).toContain('china');
		});

		it('should filter if any keyword matches', () => {
			const story = createStory({
				title: 'European markets rise',
			});
			const result = shouldFilterStory(story, ['u.s.', 'european'], 'title');
			expect(result.shouldFilter).toBe(true);
			expect(result.matchedKeywords).toEqual(['european']);
		});
	});

	describe('empty or no keywords', () => {
		it('should not filter when keywords array is empty', () => {
			const story = createStory({
				title: 'Any title here',
			});
			const result = shouldFilterStory(story, [], 'title');
			expect(result.shouldFilter).toBe(false);
		});

		it('should handle null/undefined gracefully', () => {
			const story = createStory({
				title: 'Any title here',
			});
			const result = shouldFilterStory(story, null as unknown as string[], 'title');
			expect(result.shouldFilter).toBe(false);
		});
	});

	describe('special regex characters in keywords', () => {
		it('should escape regex special characters', () => {
			const story = createStory({
				title: 'Price is $100 today',
			});
			const result = shouldFilterStory(story, ['$100'], 'title');
			expect(result.shouldFilter).toBe(true);
		});

		it('should handle parentheses in keywords', () => {
			const story = createStory({
				title: 'Company (NYSE) reports earnings',
			});
			const result = shouldFilterStory(story, ['(nyse)'], 'title');
			expect(result.shouldFilter).toBe(true);
		});
	});
});

describe('filterStories', () => {
	it('should hide stories when filterMode is "hide"', () => {
		const stories = [
			createStory({ id: '1', title: 'U.S. news story' }),
			createStory({ id: '2', title: 'European news story' }),
		];
		const result = filterStories(stories, ['u.s.'], 'title', 'hide');
		expect(result.filtered).toHaveLength(1);
		expect(result.filtered[0].id).toBe('2');
		expect(result.hidden).toHaveLength(1);
		expect(result.hidden[0].id).toBe('1');
		expect(result.filteredCount).toBe(1);
	});

	it('should blur stories when filterMode is "blur"', () => {
		const stories = [
			createStory({ id: '1', title: 'U.S. news story' }),
			createStory({ id: '2', title: 'European news story' }),
		];
		const result = filterStories(stories, ['u.s.'], 'title', 'blur');
		expect(result.filtered).toHaveLength(2);
		expect(result.filtered[0]._filtered).toBe(true);
		expect(result.filtered[0]._matchedKeywords).toContain('u.s.');
		expect(result.filtered[1]._filtered).toBeUndefined();
		expect(result.hidden).toHaveLength(0);
		expect(result.filteredCount).toBe(1);
	});

	it('should return all stories when no keywords', () => {
		const stories = [
			createStory({ id: '1', title: 'Story 1' }),
			createStory({ id: '2', title: 'Story 2' }),
		];
		const result = filterStories(stories, [], 'title', 'hide');
		expect(result.filtered).toHaveLength(2);
		expect(result.hidden).toHaveLength(0);
		expect(result.filteredCount).toBe(0);
	});
});

describe('filterStories with a story-count limit (backfill)', () => {
	// Pool of 12 as produced by the backend, "football" stories interleaved.
	function pool(filteredIndexes: number[]): Story[] {
		return Array.from({ length: 12 }, (_, i) =>
			createStory({
				id: String(i + 1),
				title: filteredIndexes.includes(i) ? `Football match ${i + 1}` : `Story ${i + 1}`,
			}),
		);
	}

	it('backfills hidden stories so the configured count is still reached', () => {
		// The first four slots are all football; without backfill only 2 of 6 would show.
		const result = filterStories(pool([0, 1, 2, 3]), ['football'], 'title', 'hide', 6);

		expect(result.filtered).toHaveLength(6);
		expect(result.filtered.map((s) => s.id)).toEqual(['5', '6', '7', '8', '9', '10']);
	});

	it('counts only the stories passed over on the way to the limit', () => {
		// Stories 11 and 12 are also filtered but sit beyond the cutoff, so counting
		// them would overstate how much the filter actually removed from view.
		const result = filterStories(pool([0, 1, 10, 11]), ['football'], 'title', 'hide', 6);

		expect(result.filtered).toHaveLength(6);
		expect(result.hidden.map((s) => s.id)).toEqual(['1', '2']);
		expect(result.filteredCount).toBe(2);
	});

	it('returns fewer than the limit when the pool genuinely runs out', () => {
		const result = filterStories(
			pool([0, 1, 2, 3, 4, 5, 6, 7, 8]),
			['football'],
			'title',
			'hide',
			6,
		);

		expect(result.filtered.map((s) => s.id)).toEqual(['10', '11', '12']);
		expect(result.filteredCount).toBe(9);
	});

	it('does not backfill in blur mode, where filtered stories still occupy slots', () => {
		const result = filterStories(pool([0, 1, 2, 3]), ['football'], 'title', 'blur', 6);

		expect(result.filtered).toHaveLength(6);
		expect(result.filtered.map((s) => s.id)).toEqual(['1', '2', '3', '4', '5', '6']);
		expect(result.filtered.filter((s) => s._filtered)).toHaveLength(4);
		expect(result.filteredCount).toBe(4);
	});

	it('applies the limit when no keywords are set', () => {
		const result = filterStories(pool([]), [], 'title', 'hide', 6);

		expect(result.filtered).toHaveLength(6);
		expect(result.filteredCount).toBe(0);
	});

	it('is unchanged from the pre-backfill behaviour when no limit is passed', () => {
		const stories = pool([0, 1]);
		const unlimited = filterStories(stories, ['football'], 'title', 'hide');

		expect(unlimited.filtered).toHaveLength(10);
		expect(unlimited.hidden).toHaveLength(2);
		expect(unlimited.filteredCount).toBe(2);
	});
});

describe('filterStories with an invalid limit', () => {
	function pool(): Story[] {
		return Array.from({ length: 12 }, (_, i) =>
			createStory({ id: String(i + 1), title: i < 2 ? `Football ${i + 1}` : `Story ${i + 1}` }),
		);
	}

	// `filtered.length >= NaN` is always false, so a non-finite limit would never
	// stop the loop and would silently return the whole pool.
	it.each([
		['NaN', Number.NaN],
		['Infinity', Number.POSITIVE_INFINITY],
	])('treats a %s limit as no limit rather than returning everything', (_label, limit) => {
		const result = filterStories(pool(), ['football'], 'title', 'hide', limit);

		expect(result.filtered).toHaveLength(10);
		expect(result.hidden).toHaveLength(2);
	});

	it('treats a NaN limit as no limit when there are no keywords', () => {
		const result = filterStories(pool(), [], 'title', 'hide', Number.NaN);

		expect(result.filtered).toHaveLength(12);
	});
});

describe('sources versus content (KNEWS-467)', () => {
	// An Italy story sourced from Agenzia Italia (agi.it) that says nothing
	// about artificial general intelligence.
	function agiStory(overrides: Partial<Story> = {}): Story {
		return createStory({
			title: 'Quattro morti in tre incidenti nei rally italiani nel weekend',
			category: 'Cronaca',
			short_summary: 'Incidenti mortali durante gare automobilistiche in Sicilia e Liguria.',
			perspectives: [
				{
					text: 'Gli organizzatori chiedono nuove regole di sicurezza.',
					sources: [
						{ name: 'AGI', url: 'https://www.agi.it/cronaca/news/2026-09-06/rally-38906984/' },
					],
				},
			],
			domains: [{ name: 'agi.it' }, { name: 'iltempo.it' }],
			articles: [
				{
					title: 'Rally, morto copilota in Liguria',
					link: 'https://www.agi.it/cronaca/news/2026-09-06/rally-38906984/',
					domain: 'agi.it',
					date: '2026-09-06',
				},
			],
			...overrides,
		});
	}

	it('does not let a topic keyword match a source domain, source name or article URL', () => {
		const result = shouldFilterStory(agiStory(), ['agi'], 'all');
		expect(result.shouldFilter).toBe(false);
		expect(result.matchedKeywords).toEqual([]);
	});

	it('does not let a topic keyword match an inline citation marker in the text', () => {
		// Summaries cite sources inline; the frontend renders these as links.
		const story = agiStory({
			title: 'Di Battista resta ricoverato a Cuba dopo intervento [agi.it#1]',
			short_summary:
				'Era stato trasferito nella capitale cubana [ansa.it#1][agi.it#1][adnkronos.com#1]. Nessun bollettino [common knowledge].',
			perspectives: [{ text: 'La famiglia chiede riservatezza [agi.it#2].', sources: [] }],
		});
		const result = shouldFilterStory(story, ['agi'], 'all');
		expect(result.shouldFilter).toBe(false);
	});

	it('still matches the topic keyword when the story text mentions it', () => {
		const story = agiStory({ title: "Verso l'AGI: OpenAI annuncia un nuovo modello" });
		const result = shouldFilterStory(story, ['agi'], 'all');
		expect(result.shouldFilter).toBe(true);
		expect(result.matchedKeywords).toEqual(['agi']);
	});

	it('does not match a topic keyword that only appears in an article URL path', () => {
		const story = createStory({
			title: 'Neutral headline',
			short_summary: 'Neutral summary',
			articles: [
				{
					title: 'Neutral',
					link: 'https://example.com/news/trump-rally-2026/',
					domain: 'example.com',
					date: '2026-09-06',
				},
			],
		});
		expect(shouldFilterStory(story, ['trump'], 'all').shouldFilter).toBe(false);
	});

	it('hides a story sourced from a hostname keyword (Tabloid Sources preset)', () => {
		const story = createStory({ domains: [{ name: 'dailymail.co.uk' }] });
		const result = shouldFilterStory(story, ['dailymail.co.uk'], 'all');
		expect(result.shouldFilter).toBe(true);
		expect(result.matchedKeywords).toEqual(['dailymail.co.uk']);
	});

	it('matches a hostname keyword against subdomains and www prefixes on either side', () => {
		expect(
			shouldFilterStory(
				createStory({ domains: [{ name: 'news.dailymail.co.uk' }] }),
				['dailymail.co.uk'],
				'all',
			).shouldFilter,
		).toBe(true);
		expect(
			shouldFilterStory(
				createStory({ domains: [{ name: 'www.dailymail.co.uk' }] }),
				['dailymail.co.uk'],
				'all',
			).shouldFilter,
		).toBe(true);
		expect(
			shouldFilterStory(
				createStory({ domains: [{ name: 'dailymail.co.uk' }] }),
				['www.dailymail.co.uk'],
				'all',
			).shouldFilter,
		).toBe(true);
	});

	it('does not match a hostname keyword against a look-alike host', () => {
		expect(
			shouldFilterStory(
				createStory({ domains: [{ name: 'notdailymail.co.uk' }] }),
				['dailymail.co.uk'],
				'all',
			).shouldFilter,
		).toBe(false);
		expect(
			shouldFilterStory(
				createStory({ domains: [{ name: 'dailymail.co.uk.example.com' }] }),
				['dailymail.co.uk'],
				'all',
			).shouldFilter,
		).toBe(false);
	});

	it('matches a hostname keyword against an article domain, or its link when the domain is missing', () => {
		const withDomain = createStory({
			articles: [
				{
					title: 'T',
					link: 'https://www.tmz.com/2026/09/06/story/',
					domain: 'tmz.com',
					date: '2026-09-06',
				},
			],
		});
		expect(shouldFilterStory(withDomain, ['tmz.com'], 'all').shouldFilter).toBe(true);

		const linkOnly = createStory({
			articles: [
				{
					title: 'T',
					link: 'https://www.tmz.com/2026/09/06/story/',
					domain: '',
					date: '2026-09-06',
				},
			],
		});
		expect(shouldFilterStory(linkOnly, ['tmz.com'], 'all').shouldFilter).toBe(true);
	});

	it('matches a subdomain keyword through the article link when the stored domain is the registered domain', () => {
		// The backend stores tldextract's registered domain, so the Estonian
		// tabloid entry `elu24.postimees.ee` only appears in the link.
		const story = createStory({
			domains: [{ name: 'postimees.ee' }],
			articles: [
				{
					title: 'T',
					link: 'https://elu24.postimees.ee/8000000/staar-lahutab',
					domain: 'postimees.ee',
					date: '2026-09-06',
				},
			],
		});
		expect(shouldFilterStory(story, ['elu24.postimees.ee'], 'all').shouldFilter).toBe(true);
		expect(shouldFilterStory(story, ['postimees.ee'], 'all').shouldFilter).toBe(true);
		expect(shouldFilterStory(story, ['kroonika.delfi.ee'], 'all').shouldFilter).toBe(false);
	});

	it('ignores null perspective entries instead of throwing', () => {
		const story = createStory({
			title: 'Neutral',
			perspectives: [null as unknown as Perspective, { text: 'Football fans react', sources: [] }],
		});
		expect(() => shouldFilterStory(story, ['football'], 'all')).not.toThrow();
		expect(shouldFilterStory(story, ['football'], 'all').shouldFilter).toBe(true);
	});

	it('treats keywords with a leading or trailing dot as content, not hostnames', () => {
		const story = createStory({ title: 'Neutral', domains: [{ name: 'u.s' }, { name: 'net' }] });
		expect(shouldFilterStory(story, ['u.s.', '.net'], 'all').shouldFilter).toBe(false);
		expect(
			shouldFilterStory(createStory({ title: 'U.S. adults' }), ['u.s.'], 'all').shouldFilter,
		).toBe(true);
	});

	it('only consults sources in the "all" scope, as before', () => {
		const story = createStory({ domains: [{ name: 'dailymail.co.uk' }] });
		expect(shouldFilterStory(story, ['dailymail.co.uk'], 'title').shouldFilter).toBe(false);
		expect(shouldFilterStory(story, ['dailymail.co.uk'], 'summary').shouldFilter).toBe(false);
	});

	it('backfills Italian stories the agi keyword used to hide', () => {
		const stories = [agiStory({ id: '1' }), agiStory({ id: '2' }), createStory({ id: '3' })];
		const { filtered, hidden, filteredCount } = filterStories(stories, ['agi'], 'all', 'hide', 3);
		expect(filtered.map((s) => s.id)).toEqual(['1', '2', '3']);
		expect(hidden).toEqual([]);
		expect(filteredCount).toBe(0);
	});
});
