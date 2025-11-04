import { describe, it, expect } from 'vitest';
import { containsCJK } from './textUtils';

describe('textUtils', () => {
	describe('containsCJK', () => {
		it('should detect Chinese characters', () => {
			expect(containsCJK('中国新闻')).toBe(true);
			expect(containsCJK('This has 中文 mixed in')).toBe(true);
		});

		it('should detect Japanese Hiragana', () => {
			expect(containsCJK('ひらがな')).toBe(true);
			expect(containsCJK('Japanese text with ひらがな')).toBe(true);
		});

		it('should detect Japanese Katakana', () => {
			expect(containsCJK('カタカナ')).toBe(true);
			expect(containsCJK('Japanese text with カタカナ')).toBe(true);
		});

		it('should detect Korean Hangul', () => {
			expect(containsCJK('한국어')).toBe(true);
			expect(containsCJK('Korean text with 한국어')).toBe(true);
		});

		it('should return false for Latin text', () => {
			expect(containsCJK('Hello World')).toBe(false);
			expect(containsCJK('This is English text')).toBe(false);
		});

		it('should return false for accented characters', () => {
			expect(containsCJK('Assemblée adopte nouvel impôt sur la fortune improductive')).toBe(false);
			expect(containsCJK('café naïve résumé')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(containsCJK('')).toBe(false);
		});
	});
});
