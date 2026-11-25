import { formatTimelineDate } from './formatTimelineDate';
import { describe, expect, it } from 'vitest';

describe('formatTimelineDate', () => {
	describe('full precision (YYYY-MM-DD)', () => {
		it('formats date in day-first order without year when same as batch year', () => {
			const result = formatTimelineDate('2025-02-10', 'Feb 10', 'en', 2025);
			expect(result).toBe('10 February');
		});

		it('includes year in day-first order when different from batch year', () => {
			const result = formatTimelineDate('2024-12-25', 'Dec 25', 'en', 2025);
			expect(result).toBe('25 December 2024');
		});
	});

	describe('month precision (YYYY-MM)', () => {
		it('formats month without year when same as batch year', () => {
			const result = formatTimelineDate('2025-01', 'January 2025', 'en', 2025);
			expect(result).toBe('January');
		});

		it('includes year when different from batch year', () => {
			const result = formatTimelineDate('2025-01', 'January 2025', 'en', 2026);
			expect(result).toBe('January 2025');
		});
	});

	describe('year precision (YYYY)', () => {
		it('returns year as-is', () => {
			const result = formatTimelineDate('2024', '2024', 'en', 2025);
			expect(result).toBe('2024');
		});

		it('returns year even when same as batch year', () => {
			const result = formatTimelineDate('2025', '2025', 'en', 2025);
			expect(result).toBe('2025');
		});
	});

	describe('fallback behavior', () => {
		it('falls back to originalDate when dateIso is undefined', () => {
			const result = formatTimelineDate(undefined, 'last Monday', 'en', 2025);
			expect(result).toBe('last Monday');
		});

		it('falls back to originalDate when dateIso is empty string', () => {
			const result = formatTimelineDate('', 'last Monday', 'en', 2025);
			expect(result).toBe('last Monday');
		});

		it('falls back to originalDate when dateIso is invalid format', () => {
			const result = formatTimelineDate('not-a-date', 'some time ago', 'en', 2025);
			expect(result).toBe('some time ago');
		});
	});

	describe('locale support', () => {
		it('formats in French locale with day-first order', () => {
			const result = formatTimelineDate('2025-02-10', 'Feb 10', 'fr', 2025);
			// French: "10 février"
			expect(result).toContain('10');
			expect(result.toLowerCase()).toContain('février');
		});

		it('formats month in German locale', () => {
			const result = formatTimelineDate('2025-01', 'January 2025', 'de', 2025);
			expect(result.toLowerCase()).toBe('januar');
		});
	});
});
