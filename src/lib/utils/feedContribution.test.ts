import {
	parseCoreFeedsPy,
	serializeCoreFeedsPy,
	parsePrBody,
	parseFeedUrls,
	deduplicateFeeds,
	generateModifiedJson,
	generateIssueUrl,
	fixMojibake,
	fixFeedsDisplayNames,
	type KiteFeedsData,
	type FeedCheckResult,
} from './feedContribution';
import { describe, expect, it } from 'vitest';

// ─── parseCoreFeedsPy ────────────────────────────────────────────────

describe('parseCoreFeedsPy', () => {
	it('should parse a single category with multiple feeds', () => {
		const content = `feeds = {
    "World": [
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    ],
}
`;
		const result = parseCoreFeedsPy(content);

		expect(Object.keys(result)).toEqual(['World']);
		expect(result.World.category_type).toBe('core');
		expect(result.World.source_language).toBe('en');
		expect(result.World.display_names).toEqual({ en: 'World' });
		expect(result.World.feeds).toEqual([
			'https://feeds.bbci.co.uk/news/world/rss.xml',
			'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
		]);
	});

	it('should parse multiple categories', () => {
		const content = `feeds = {
    "AI": [
        "http://bair.berkeley.edu/blog/feed.xml",
        "https://openai.com/blog/rss/",
    ],
    "Science": [
        "https://www.nature.com/nature.rss",
    ],
}
`;
		const result = parseCoreFeedsPy(content);

		expect(Object.keys(result)).toHaveLength(2);
		expect(result.AI.feeds).toHaveLength(2);
		expect(result.Science.feeds).toHaveLength(1);
	});

	it('should handle categories with spaces and special characters in names', () => {
		const content = `feeds = {
    "Bay Area": [
        "https://example.com/feed.xml",
    ],
    "Celebs and Movies": [
        "https://example.com/celebs.rss",
    ],
}
`;
		const result = parseCoreFeedsPy(content);

		expect(result['Bay Area']).toBeDefined();
		expect(result['Celebs and Movies']).toBeDefined();
	});

	it('should handle http and https URLs', () => {
		const content = `feeds = {
    "Test": [
        "http://legacy.example.com/feed.xml",
        "https://modern.example.com/feed.xml",
    ],
}
`;
		const result = parseCoreFeedsPy(content);

		expect(result.Test.feeds).toEqual([
			'http://legacy.example.com/feed.xml',
			'https://modern.example.com/feed.xml',
		]);
	});

	it('should skip categories with no valid URLs', () => {
		const content = `feeds = {
    "Empty": [
    ],
    "HasFeeds": [
        "https://example.com/feed.xml",
    ],
}
`;
		const result = parseCoreFeedsPy(content);

		expect(result.Empty).toBeUndefined();
		expect(result.HasFeeds).toBeDefined();
	});

	it('should return empty object for invalid content', () => {
		expect(parseCoreFeedsPy('')).toEqual({});
		expect(parseCoreFeedsPy('not python')).toEqual({});
		expect(parseCoreFeedsPy('feeds = {}')).toEqual({});
	});

	it('should handle URLs with query parameters and fragments', () => {
		const content = `feeds = {
    "Test": [
        "https://example.com/feed?format=rss&lang=en",
        "https://example.com/feed#section",
    ],
}
`;
		const result = parseCoreFeedsPy(content);

		expect(result.Test.feeds).toEqual([
			'https://example.com/feed?format=rss&lang=en',
			'https://example.com/feed#section',
		]);
	});
});

// ─── serializeCoreFeedsPy ────────────────────────────────────────────

describe('serializeCoreFeedsPy', () => {
	it('should serialize a single category', () => {
		const feeds = {
			World: ['https://example.com/b.xml', 'https://example.com/a.xml'],
		};

		const result = serializeCoreFeedsPy(feeds);

		expect(result).toContain('feeds = {');
		expect(result).toContain('    "World": [');
		// URLs should be sorted
		expect(result.indexOf('a.xml')).toBeLessThan(result.indexOf('b.xml'));
		expect(result).toContain('        "https://example.com/a.xml",');
		expect(result.endsWith('}\n')).toBe(true);
	});

	it('should sort categories alphabetically', () => {
		const feeds = {
			Zebra: ['https://z.com/feed.xml'],
			Alpha: ['https://a.com/feed.xml'],
		};

		const result = serializeCoreFeedsPy(feeds);

		expect(result.indexOf('Alpha')).toBeLessThan(result.indexOf('Zebra'));
	});

	it('should round-trip with parseCoreFeedsPy', () => {
		const original = {
			AI: ['https://ai.example.com/feed.xml', 'https://ml.example.com/feed.xml'],
			World: ['https://bbc.com/feed.xml', 'https://nyt.com/feed.xml'],
		};

		const serialized = serializeCoreFeedsPy(original);
		const parsed = parseCoreFeedsPy(serialized);

		expect(parsed.AI.feeds).toEqual(original.AI.sort());
		expect(parsed.World.feeds).toEqual(original.World.sort());
	});
});

// ─── parsePrBody ─────────────────────────────────────────────────────

describe('parsePrBody', () => {
	it('should parse a new category PR body', () => {
		const body = `## New Category

**Category**: Japan
**Feeds added**: 15
**Language**: ja

### Added feeds
- https://example.jp/feed1.xml
- https://example.jp/feed2.xml

---
*Submitted via [Kagi News Contribute UI](https://news.kagi.com/contribute)*`;

		const result = parsePrBody(body);

		expect(result).toEqual({
			categoryName: 'Japan',
			feedCount: 15,
			isNew: true,
		});
	});

	it('should parse a feed addition PR body', () => {
		const body = `## Feed Addition

**Category**: World
**Feeds added**: 3
**Total feeds after merge**: 45

### Added feeds
- https://example.com/feed.xml

---
*Submitted via [Kagi News Contribute UI](https://news.kagi.com/contribute)*`;

		const result = parsePrBody(body);

		expect(result).toEqual({
			categoryName: 'World',
			feedCount: 3,
			isNew: false,
		});
	});

	it('should return null for PR body without category', () => {
		expect(parsePrBody('')).toBeNull();
		expect(parsePrBody('Just some random PR body')).toBeNull();
	});

	it('should handle missing feed count', () => {
		const body = `## Feed Addition

**Category**: Test`;

		const result = parsePrBody(body);

		expect(result).toEqual({
			categoryName: 'Test',
			feedCount: 0,
			isNew: false,
		});
	});

	it('should trim whitespace from category name', () => {
		const body = '**Category**:   Spaced Category   \n**Feeds added**: 5';

		const result = parsePrBody(body);

		expect(result?.categoryName).toBe('Spaced Category');
	});
});

// ─── parseFeedUrls ───────────────────────────────────────────────────

describe('parseFeedUrls', () => {
	it('should parse newline-separated URLs', () => {
		const input = 'https://example.com/feed1.xml\nhttps://example.com/feed2.xml';
		const result = parseFeedUrls(input);

		expect(result).toHaveLength(2);
		expect(result).toContain('https://example.com/feed1.xml');
		expect(result).toContain('https://example.com/feed2.xml');
	});

	it('should parse comma-separated URLs', () => {
		const input = 'https://example.com/feed1.xml, https://example.com/feed2.xml';
		const result = parseFeedUrls(input);

		expect(result).toHaveLength(2);
	});

	it('should parse space-separated URLs', () => {
		const input = 'https://example.com/feed1.xml https://example.com/feed2.xml';
		const result = parseFeedUrls(input);

		expect(result).toHaveLength(2);
		expect(result).toContain('https://example.com/feed1.xml');
		expect(result).toContain('https://example.com/feed2.xml');
	});

	it('should deduplicate URLs', () => {
		const input = 'https://example.com/feed.xml\nhttps://example.com/feed.xml';
		const result = parseFeedUrls(input);

		expect(result).toHaveLength(1);
	});

	it('should skip invalid URLs', () => {
		const input = 'https://valid.com/feed.xml\nnot-a-url\nhttps://also-valid.com/feed.xml';
		const result = parseFeedUrls(input);

		expect(result).toHaveLength(2);
	});

	it('should skip non-http(s) protocols', () => {
		const input = 'ftp://example.com/feed.xml\nhttps://valid.com/feed.xml';
		const result = parseFeedUrls(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('https://valid.com/feed.xml');
	});

	it('should handle empty input', () => {
		expect(parseFeedUrls('')).toEqual([]);
		expect(parseFeedUrls('   ')).toEqual([]);
	});

	it('should trim whitespace around URLs', () => {
		const input = '  https://example.com/feed.xml  \n  https://other.com/feed.xml  ';
		const result = parseFeedUrls(input);

		expect(result).toHaveLength(2);
	});
});

// ─── deduplicateFeeds ────────────────────────────────────────────────

describe('deduplicateFeeds', () => {
	it('should identify unique and duplicate feeds', () => {
		const newUrls = [
			'https://new.com/feed.xml',
			'https://existing.com/feed.xml',
			'https://another-new.com/feed.xml',
		];
		const existingUrls = ['https://existing.com/feed.xml'];

		const result = deduplicateFeeds(newUrls, existingUrls);

		expect(result.unique).toEqual(['https://new.com/feed.xml', 'https://another-new.com/feed.xml']);
		expect(result.duplicates).toEqual(['https://existing.com/feed.xml']);
	});

	it('should be case-insensitive', () => {
		const newUrls = ['https://EXAMPLE.COM/Feed.xml'];
		const existingUrls = ['https://example.com/feed.xml'];

		const result = deduplicateFeeds(newUrls, existingUrls);

		expect(result.unique).toEqual([]);
		expect(result.duplicates).toEqual(['https://EXAMPLE.COM/Feed.xml']);
	});

	it('should handle empty inputs', () => {
		expect(deduplicateFeeds([], [])).toEqual({ unique: [], duplicates: [] });
		expect(deduplicateFeeds(['https://a.com/feed'], [])).toEqual({
			unique: ['https://a.com/feed'],
			duplicates: [],
		});
		expect(deduplicateFeeds([], ['https://a.com/feed'])).toEqual({
			unique: [],
			duplicates: [],
		});
	});

	it('should handle all duplicates', () => {
		const urls = ['https://a.com/feed', 'https://b.com/feed'];
		const result = deduplicateFeeds(urls, urls);

		expect(result.unique).toEqual([]);
		expect(result.duplicates).toHaveLength(2);
	});
});

// ─── generateModifiedJson ────────────────────────────────────────────

describe('generateModifiedJson', () => {
	const baseData: KiteFeedsData = {
		France: {
			category_type: 'topic',
			source_language: 'fr',
			display_names: { en: 'France', fr: 'France' },
			feeds: ['https://lemonde.fr/rss.xml'],
		},
	};

	it('should add feeds to existing category', () => {
		const result = generateModifiedJson(baseData, 'France', ['https://lefigaro.fr/rss.xml'], false);

		expect(result.France.feeds).toContain('https://lemonde.fr/rss.xml');
		expect(result.France.feeds).toContain('https://lefigaro.fr/rss.xml');
		expect(result.France.feeds).toEqual([...result.France.feeds].sort());
	});

	it('should create new category', () => {
		const result = generateModifiedJson(
			baseData,
			'Japan',
			['https://nhk.or.jp/rss.xml'],
			true,
			'ja',
		);

		expect(result.Japan).toBeDefined();
		expect(result.Japan.category_type).toBe('topic');
		expect(result.Japan.source_language).toBe('ja');
		expect(result.Japan.display_names).toEqual({ en: 'Japan' });
		expect(result.Japan.feeds).toEqual(['https://nhk.or.jp/rss.xml']);
	});

	it('should default to English for new categories without language', () => {
		const result = generateModifiedJson(baseData, 'Test', ['https://test.com/feed'], true);

		expect(result.Test.source_language).toBe('en');
	});

	it('should sort categories alphabetically', () => {
		const result = generateModifiedJson(baseData, 'Alpha', ['https://a.com/feed'], true);

		const keys = Object.keys(result);
		expect(keys[0]).toBe('Alpha');
		expect(keys[1]).toBe('France');
	});

	it('should sort feeds within a category', () => {
		const result = generateModifiedJson(
			baseData,
			'France',
			['https://zzz.fr/feed', 'https://aaa.fr/feed'],
			false,
		);

		expect(result.France.feeds[0]).toBe('https://aaa.fr/feed');
	});

	it('should not mutate the original data', () => {
		const original = { ...baseData };
		generateModifiedJson(baseData, 'New', ['https://new.com/feed'], true);

		expect(Object.keys(baseData)).toEqual(Object.keys(original));
	});
});

// ─── generateIssueUrl ────────────────────────────────────────────────

describe('generateIssueUrl', () => {
	const feeds: FeedCheckResult[] = [
		{ url: 'https://valid.com/feed.xml', status: 'valid' },
		{ url: 'https://unknown.com/feed.xml', status: 'unknown' },
		{ url: 'https://error.com/feed.xml', status: 'error' },
	];

	it('should generate a valid GitHub issue URL', () => {
		const url = generateIssueUrl('Test Category', false, feeds);

		expect(url).toContain('https://github.com/kagisearch/kite-public/issues/new');
		expect(url).toContain('labels=feeds');
	});

	it('should include correct title for new categories', () => {
		const url = generateIssueUrl('Japan', true, feeds);
		const params = new URL(url).searchParams;

		expect(params.get('title')).toBe('New Category: Japan');
	});

	it('should include correct title for existing categories', () => {
		const url = generateIssueUrl('World', false, feeds);
		const params = new URL(url).searchParams;

		expect(params.get('title')).toBe('Add 3 feed(s) to World');
	});

	it('should include feed validation summary', () => {
		const url = generateIssueUrl('Test', false, feeds);
		const body = new URL(url).searchParams.get('body') || '';

		expect(body).toContain('1 valid');
		expect(body).toContain('1 unverified');
		expect(body).toContain('1 errors');
	});

	it('should handle very long URLs by falling back to short format', () => {
		// Create feeds with long enough URLs to exceed the 7500 char limit
		const manyFeeds: FeedCheckResult[] = Array.from({ length: 100 }, (_, i) => ({
			url: `https://example-${i}-with-a-very-long-subdomain-name-here.news.feeds.organization.com/rss/v2/full/main.xml`,
			status: 'valid' as const,
		}));

		const url = generateIssueUrl('Long Category', false, manyFeeds);
		const body = new URL(url).searchParams.get('body') || '';

		// Short format uses "N total" instead of per-feed status icons
		expect(body).toContain('100 total');
		// Should NOT contain status icons in short format
		expect(body).not.toContain('\u2705');
	});
});

// ─── fixMojibake ─────────────────────────────────────────────────────

describe('fixMojibake', () => {
	it('should fix double-encoded UTF-8 Latin characters', () => {
		// "Asië" encoded as UTF-8 then stored as Latin-1 → "AsiÃ«"
		expect(fixMojibake('Asi\u00c3\u00ab')).toBe('Asië');
	});

	it('should fix double-encoded accented characters', () => {
		// "Àsia" → "Ãsia" in mojibake
		expect(fixMojibake('\u00c3\u0080sia')).toBe('Àsia');
		// "França" → "FranÃ§a"
		expect(fixMojibake('Fran\u00c3\u00a7a')).toBe('França');
	});

	it('should leave ASCII strings unchanged', () => {
		expect(fixMojibake('Asia')).toBe('Asia');
		expect(fixMojibake('Asien')).toBe('Asien');
		expect(fixMojibake('France')).toBe('France');
	});

	it('should leave already-correct Unicode strings unchanged', () => {
		// These contain characters > 255 so should not be "fixed"
		expect(fixMojibake('日本')).toBe('日本');
		expect(fixMojibake('アジア')).toBe('アジア');
		expect(fixMojibake('亚洲')).toBe('亚洲');
	});

	it('should handle empty strings', () => {
		expect(fixMojibake('')).toBe('');
	});
});

// ─── fixFeedsDisplayNames ────────────────────────────────────────────

describe('fixFeedsDisplayNames', () => {
	it('should fix mojibake in display_names across categories', () => {
		const data: KiteFeedsData = {
			Asia: {
				category_type: 'topic',
				source_language: 'en',
				display_names: {
					en: 'Asia',
					af: 'Asi\u00c3\u00ab', // mojibake for "Asië"
					da: 'Asien', // ASCII, no change
				},
				feeds: ['https://example.com/feed.xml'],
			},
		};

		const fixed = fixFeedsDisplayNames(data);

		expect(fixed.Asia.display_names.en).toBe('Asia');
		expect(fixed.Asia.display_names.af).toBe('Asië');
		expect(fixed.Asia.display_names.da).toBe('Asien');
	});

	it('should not mutate the original data', () => {
		const original: KiteFeedsData = {
			Test: {
				category_type: 'topic',
				source_language: 'en',
				display_names: { en: 'Test', fr: 'Fran\u00c3\u00a7a' },
				feeds: [],
			},
		};

		const originalFr = original.Test.display_names.fr;
		fixFeedsDisplayNames(original);
		expect(original.Test.display_names.fr).toBe(originalFr);
	});

	it('should preserve feeds and other fields', () => {
		const data: KiteFeedsData = {
			Test: {
				category_type: 'topic',
				source_language: 'ja',
				display_names: { en: 'Test' },
				feeds: ['https://a.com/feed', 'https://b.com/feed'],
			},
		};

		const fixed = fixFeedsDisplayNames(data);

		expect(fixed.Test.category_type).toBe('topic');
		expect(fixed.Test.source_language).toBe('ja');
		expect(fixed.Test.feeds).toEqual(['https://a.com/feed', 'https://b.com/feed']);
	});
});
