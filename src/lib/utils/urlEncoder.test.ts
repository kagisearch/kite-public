import { describe, expect, it } from 'vitest';
import {
	buildArticleUrl,
	buildCategoryUrl,
	decodeArticleId,
	decodeBatchId,
	encodeArticleId,
	encodeBatchId,
	generateSlug,
	parseUrl,
} from './urlEncoder';

describe('urlEncoder', () => {
	describe('encodeBatchId', () => {
		it('should encode batch ID into 9-digit code', () => {
			expect(encodeBatchId('2025-01-15.1')).toBe('202501151');
			expect(encodeBatchId('2025-06-21.1')).toBe('202506211');
			expect(encodeBatchId('2025-10-07.2')).toBe('202510072');
		});

		it('should throw error for invalid batch ID format', () => {
			expect(() => encodeBatchId('2025-01-15')).toThrow();
			expect(() => encodeBatchId('invalid')).toThrow();
		});
	});

	describe('decodeBatchId', () => {
		it('should decode 9-digit code to batch ID', () => {
			expect(decodeBatchId('202501151')).toBe('2025-01-15.1');
			expect(decodeBatchId('202506211')).toBe('2025-06-21.1');
			expect(decodeBatchId('202510072')).toBe('2025-10-07.2');
		});

		it('should return null for invalid codes', () => {
			expect(decodeBatchId('12345')).toBe(null);
			expect(decodeBatchId('invalid')).toBe(null);
			expect(decodeBatchId('20251315')).toBe(null); // Invalid month
		});

		it('should round-trip encode/decode', () => {
			const testCases = ['2025-01-15.1', '2025-06-21.1', '2025-12-31.9'];
			testCases.forEach((batchId) => {
				const encoded = encodeBatchId(batchId);
				const decoded = decodeBatchId(encoded);
				expect(decoded).toBe(batchId);
			});
		});
	});

	describe('encodeArticleId', () => {
		it('should encode batch ID and cluster ID correctly', () => {
			expect(encodeArticleId('2025-01-15.1', 998)).toBe('202501151998');
			expect(encodeArticleId('2025-06-21.1', 3327998)).toBe('2025062113327998');
			expect(encodeArticleId('2025-10-07.2', 123)).toBe('202510072123');
		});

		it('should handle different batch sequences', () => {
			expect(encodeArticleId('2025-01-15.1', 100)).toBe('202501151100');
			expect(encodeArticleId('2025-01-15.2', 100)).toBe('202501152100');
			expect(encodeArticleId('2025-01-15.9', 100)).toBe('202501159100');
		});

		it('should throw error for invalid batch ID format', () => {
			expect(() => encodeArticleId('2025-01-15', 998)).toThrow();
			expect(() => encodeArticleId('2025/01/15.1', 998)).toThrow();
			expect(() => encodeArticleId('invalid', 998)).toThrow();
		});
	});

	describe('decodeArticleId', () => {
		it('should decode article ID correctly', () => {
			expect(decodeArticleId('202501151998')).toEqual({
				batchId: '2025-01-15.1',
				clusterId: 998,
			});
			expect(decodeArticleId('2025062113327998')).toEqual({
				batchId: '2025-06-21.1',
				clusterId: 3327998,
			});
			expect(decodeArticleId('202510072123')).toEqual({
				batchId: '2025-10-07.2',
				clusterId: 123,
			});
		});

		it('should handle different batch sequences', () => {
			expect(decodeArticleId('202501151100')).toEqual({
				batchId: '2025-01-15.1',
				clusterId: 100,
			});
			expect(decodeArticleId('202501159100')).toEqual({
				batchId: '2025-01-15.9',
				clusterId: 100,
			});
		});

		it('should return null for invalid encoded IDs', () => {
			expect(decodeArticleId('invalid')).toBe(null);
			expect(decodeArticleId('12345')).toBe(null);
			expect(decodeArticleId('2025011')).toBe(null); // Too short
			expect(decodeArticleId('20251315998')).toBe(null); // Invalid month
		});

		it('should round-trip encode/decode correctly', () => {
			const testCases = [
				{ batchId: '2025-01-15.1', clusterId: 998 },
				{ batchId: '2025-06-21.1', clusterId: 3327998 },
				{ batchId: '2025-12-31.9', clusterId: 1 },
				{ batchId: '2025-10-07.5', clusterId: 123456 },
			];

			testCases.forEach(({ batchId, clusterId }) => {
				const encoded = encodeArticleId(batchId, clusterId);
				const decoded = decodeArticleId(encoded);
				expect(decoded).toEqual({ batchId, clusterId });
			});
		});
	});

	describe('generateSlug', () => {
		it('should generate URL-friendly slugs', () => {
			expect(generateSlug('French Prime Minister Resigns')).toBe('french-prime-minister-resigns');
			expect(generateSlug('Breaking News: Major Update!')).toBe('breaking-news-major-update');
			expect(generateSlug('COVID-19 Cases Rise')).toBe('covid-19-cases-rise');
		});

		it('should handle special characters', () => {
			expect(generateSlug('Title with "quotes" & symbols')).toBe('title-with-quotes-symbols');
			expect(generateSlug('Multiple   spaces   here')).toBe('multiple-spaces-here');
			expect(generateSlug('---Hyphens---')).toBe('hyphens');
		});

		it('should handle Unicode characters in multiple languages', () => {
			// Arabic
			expect(generateSlug('فنزويلا تغلق سفاراتها في النرويج')).toBe('فنزويلا-تغلق-سفاراتها-في-النرويج');
			// Chinese
			expect(generateSlug('中国新闻报道')).toBe('中国新闻报道');
			// Japanese
			expect(generateSlug('日本のニュース')).toBe('日本のニュース');
			// French with accents
			expect(generateSlug('Café Français')).toBe('café-français');
			// Spanish with ñ
			expect(generateSlug('España 2024')).toBe('españa-2024');
		});
	});

	describe('buildArticleUrl', () => {
		it('should build complete article URLs with date slug', () => {
			expect(
				buildArticleUrl('world', '2025-06-21.1', 3327998, 'French Prime Minister Resigns'),
			).toBe('/world/2025062113327998/french-prime-minister-resigns');

			expect(buildArticleUrl('tech', '2025-01-15.1', 998, 'New AI Breakthrough')).toBe(
				'/tech/202501151998/new-ai-breakthrough',
			);
		});

		it('should build article URLs from ISO timestamp', () => {
			expect(
				buildArticleUrl('world', '2025-06-21T12:00:00Z', 3327998, 'French Prime Minister Resigns'),
			).toBe('/world/2025062113327998/french-prime-minister-resigns');
		});

		it('should encode special characters in category IDs', () => {
			// Category with comma (Austin, TX)
			expect(buildArticleUrl('usa_|_austin,_tx', '2025-01-15.1', 998, 'Local News')).toBe(
				'/usa_%7C_austin%2C_tx/202501151998/local-news',
			);

			// Category with pipe character
			expect(buildArticleUrl('usa_|_vermont', '2025-01-15.1', 998, 'Vermont News')).toBe(
				'/usa_%7C_vermont/202501151998/vermont-news',
			);
		});
	});

	describe('buildCategoryUrl', () => {
		it('should build category URLs with date slug', () => {
			expect(buildCategoryUrl('world', '2025-01-15.1')).toBe('/world/202501151');
			expect(buildCategoryUrl('tech', '2025-06-21.1')).toBe('/tech/202506211');
		});

		it('should build category URLs from ISO timestamp', () => {
			expect(buildCategoryUrl('world', '2025-01-15T08:00:00Z')).toBe('/world/202501151');
		});

		it('should encode special characters in category IDs', () => {
			// Category with comma (Austin, TX)
			expect(buildCategoryUrl('usa_|_austin,_tx', '2025-01-15.1')).toBe(
				'/usa_%7C_austin%2C_tx/202501151',
			);

			// Category with pipe character
			expect(buildCategoryUrl('usa_|_vermont', '2025-01-15.1')).toBe('/usa_%7C_vermont/202501151');
		});
	});

	describe('parseUrl', () => {
		describe('new format', () => {
			it('should parse category URLs correctly', () => {
				expect(parseUrl('/world/202501151')).toEqual({
					categoryId: 'world',
					batchId: '2025-01-15.1',
				});

				expect(parseUrl('/tech/202506211')).toEqual({
					categoryId: 'tech',
					batchId: '2025-06-21.1',
				});
			});

			it('should parse article URLs correctly', () => {
				expect(parseUrl('/world/2025062113327998/french-prime-minister-resigns')).toEqual({
					categoryId: 'world',
					batchId: '2025-06-21.1',
					clusterId: 3327998,
					slug: 'french-prime-minister-resigns',
				});

				expect(parseUrl('/tech/202501151998/new-ai-breakthrough')).toEqual({
					categoryId: 'tech',
					batchId: '2025-01-15.1',
					clusterId: 998,
					slug: 'new-ai-breakthrough',
				});
			});

			it('should parse URL pathname without query parameters', () => {
				// parseUrl expects just the pathname, not query params
				const url = '/world/2025062113327998/french-prime-minister-resigns?data_lang=fr';
				const pathname = url.split('?')[0];
				const result = parseUrl(pathname);
				expect(result).toEqual({
					categoryId: 'world',
					batchId: '2025-06-21.1',
					clusterId: 3327998,
					slug: 'french-prime-minister-resigns',
				});
			});

			it('should handle slugs with extra slashes', () => {
				expect(parseUrl('/world/2025062113327998/slug/with/slashes')).toEqual({
					categoryId: 'world',
					batchId: '2025-06-21.1',
					clusterId: 3327998,
					slug: 'slug/with/slashes',
				});
			});

			it('should round-trip build/parse correctly', () => {
				const url = buildArticleUrl(
					'world',
					'2025-06-21.1',
					3327998,
					'French Prime Minister Resigns',
				);
				const parsed = parseUrl(url);

				expect(parsed).toEqual({
					categoryId: 'world',
					batchId: '2025-06-21.1',
					clusterId: 3327998,
					slug: 'french-prime-minister-resigns',
				});
			});

			it('should parse URLs with encoded special characters', () => {
				// Category with comma (Austin, TX)
				expect(parseUrl('/usa_%7C_austin%2C_tx/202501151998/local-news')).toEqual({
					categoryId: 'usa_|_austin,_tx',
					batchId: '2025-01-15.1',
					clusterId: 998,
					slug: 'local-news',
				});

				// Category-only URL with encoded characters
				expect(parseUrl('/usa_%7C_austin%2C_tx/202501151')).toEqual({
					categoryId: 'usa_|_austin,_tx',
					batchId: '2025-01-15.1',
				});
			});

			it('should round-trip build/parse with special characters', () => {
				// Test with comma in category ID
				const url1 = buildArticleUrl('usa_|_austin,_tx', '2025-01-15.1', 998, 'Local News');
				const parsed1 = parseUrl(url1);
				expect(parsed1).toEqual({
					categoryId: 'usa_|_austin,_tx',
					batchId: '2025-01-15.1',
					clusterId: 998,
					slug: 'local-news',
				});

				// Test category-only URL
				const url2 = buildCategoryUrl('usa_|_austin,_tx', '2025-01-15.1');
				const parsed2 = parseUrl(url2);
				expect(parsed2).toEqual({
					categoryId: 'usa_|_austin,_tx',
					batchId: '2025-01-15.1',
				});
			});
		});

		describe('legacy format - data slug (YYYY-MM-DD.N)', () => {
			it('should parse legacy category URLs with date slug', () => {
				expect(parseUrl('/2025-01-15.1/world')).toEqual({
					categoryId: 'world',
					batchId: '2025-01-15.1',
					isLegacyFormat: true,
				});

				expect(parseUrl('/2025-06-21.1/tech')).toEqual({
					categoryId: 'tech',
					batchId: '2025-06-21.1',
					isLegacyFormat: true,
				});
			});

			it('should parse legacy article URLs with date slug and story index', () => {
				expect(parseUrl('/2025-01-15.1/world/5')).toEqual({
					categoryId: 'world',
					batchId: '2025-01-15.1',
					storyIndex: 5,
					isLegacyFormat: true,
				});

				expect(parseUrl('/2025-06-21.2/tech/42')).toEqual({
					categoryId: 'tech',
					batchId: '2025-06-21.2',
					storyIndex: 42,
					isLegacyFormat: true,
				});
			});

			it('should parse legacy URLs with old date format (YYYY-MM-DD)', () => {
				expect(parseUrl('/2025-01-15/world')).toEqual({
					categoryId: 'world',
					batchId: '2025-01-15',
					isLegacyFormat: true,
				});

				expect(parseUrl('/2025-01-15/world/3')).toEqual({
					categoryId: 'world',
					batchId: '2025-01-15',
					storyIndex: 3,
					isLegacyFormat: true,
				});
			});

			it('should parse legacy URLs with encoded special characters', () => {
				// Category with comma in legacy format
				expect(parseUrl('/2025-01-15.1/usa_%7C_austin%2C_tx')).toEqual({
					categoryId: 'usa_|_austin,_tx',
					batchId: '2025-01-15.1',
					isLegacyFormat: true,
				});

				expect(parseUrl('/2025-01-15.1/usa_%7C_austin%2C_tx/5')).toEqual({
					categoryId: 'usa_|_austin,_tx',
					batchId: '2025-01-15.1',
					storyIndex: 5,
					isLegacyFormat: true,
				});
			});
		});

		describe('legacy format - UUID', () => {
			it('should parse legacy category URLs with UUID batch ID', () => {
				const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
				expect(parseUrl(`/${uuid}/world`)).toEqual({
					categoryId: 'world',
					batchId: uuid,
					isLegacyFormat: true,
				});
			});

			it('should parse legacy article URLs with UUID and story index', () => {
				const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
				expect(parseUrl(`/${uuid}/world/7`)).toEqual({
					categoryId: 'world',
					batchId: uuid,
					storyIndex: 7,
					isLegacyFormat: true,
				});
			});
		});

		it('should return null for invalid URLs', () => {
			expect(parseUrl('/world')).toBe(null);
			expect(parseUrl('/world/123')).toBe(null);
			expect(parseUrl('/invalid/url/format')).toBe(null);
		});
	});
});
