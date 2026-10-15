import { findNonTimeColon, splitAtNonTimeColon } from './colonSplitter';
import { describe, expect, it } from 'vitest';

describe('colonSplitter', () => {
	describe('findNonTimeColon', () => {
		it('should ignore colons in time formats', () => {
			expect(findNonTimeColon('Meeting at 10:00')).toBe(-1);
			expect(findNonTimeColon('From 10:00 to 15:30')).toBe(-1);
			expect(findNonTimeColon('dalle 10:00 alle 20:00')).toBe(-1);
		});

		it('should find colons that are not in time formats', () => {
			expect(findNonTimeColon('Title: Content at 10:00')).toBe(5);
			expect(findNonTimeColon('Important: Meeting at 10:00')).toBe(9);
			expect(findNonTimeColon('Gaza pause: dalle 10:00 alle 20:00')).toBe(10);
		});

		it('should handle mixed scenarios', () => {
			const text =
				"L'IDF ha dichiarato che la 'pausa tattica' umanitaria locale non si applica più a Gaza City. Le pause precedenti avevano consentito gli aiuti dalle 10:00 alle 20:00";
			expect(findNonTimeColon(text)).toBe(-1); // No non-time colon

			const textWithTitle =
				'Gaza Update: Le pause precedenti avevano consentito gli aiuti dalle 10:00 alle 20:00';
			expect(findNonTimeColon(textWithTitle)).toBe(11); // After "Gaza Update"
		});

		it('should ignore colons inside single quotes', () => {
			expect(findNonTimeColon("Signs saying 'No Shah: No Regime'")).toBe(-1);
			expect(findNonTimeColon("Protest: Signs saying 'USA: Don't Repeat 1953'")).toBe(7); // First colon outside quotes
		});

		it('should ignore colons inside double quotes', () => {
			expect(findNonTimeColon('He said "Warning: Danger ahead"')).toBe(-1);
			expect(findNonTimeColon('Quote: He said "Note: Important"')).toBe(5);
		});

		it('should ignore colons inside Japanese brackets', () => {
			expect(findNonTimeColon('「内容: 説明」')).toBe(-1);
			// タイトル (4 chars) + : at index 4
			expect(findNonTimeColon('タイトル: 「内容: 説明」を参照')).toBe(4);
			// Double corner brackets
			expect(findNonTimeColon('『タイトル: 内容』')).toBe(-1);
		});

		it('should handle curly quotes', () => {
			expect(findNonTimeColon("'Warning: Danger'")).toBe(-1);
			expect(findNonTimeColon('"Note: Important"')).toBe(-1);
		});

		it('should handle nested quotes correctly', () => {
			// Colon inside inner quotes should be ignored
			expect(findNonTimeColon("Headline: He said 'Warning: Stay away'")).toBe(8);
		});

		it('should handle null and empty input', () => {
			expect(findNonTimeColon(null as unknown as string)).toBe(-1);
			expect(findNonTimeColon(undefined as unknown as string)).toBe(-1);
			expect(findNonTimeColon('')).toBe(-1);
		});
	});

	describe('splitAtNonTimeColon', () => {
		it('should not split text with only time colons', () => {
			expect(splitAtNonTimeColon('Meeting from 10:00 to 15:30')).toBe(null);
			expect(splitAtNonTimeColon('dalle 10:00 alle 20:00')).toBe(null);
		});

		it('should split at non-time colons', () => {
			expect(splitAtNonTimeColon('Title: Content')).toEqual(['Title', 'Content']);
			expect(splitAtNonTimeColon('Update: Meeting at 10:00')).toEqual([
				'Update',
				'Meeting at 10:00',
			]);
			expect(splitAtNonTimeColon('News: From 10:00 to 15:30 daily')).toEqual([
				'News',
				'From 10:00 to 15:30 daily',
			]);
		});

		it('should handle the Italian example correctly', () => {
			const text =
				"L'IDF ha dichiarato che la 'pausa tattica' umanitaria locale non si applica più a Gaza City. Le pause precedenti avevano consentito gli aiuti dalle 10:00 alle 20:00";
			expect(splitAtNonTimeColon(text)).toBe(null); // Should not split

			const textWithTitle =
				'Gaza: Le pause precedenti avevano consentito gli aiuti dalle 10:00 alle 20:00';
			expect(splitAtNonTimeColon(textWithTitle)).toEqual([
				'Gaza',
				'Le pause precedenti avevano consentito gli aiuti dalle 10:00 alle 20:00',
			]);
		});

		it('should not split text when colon is inside quotes', () => {
			expect(splitAtNonTimeColon("Signs saying 'No Shah: No Regime'")).toBe(null);
			expect(splitAtNonTimeColon('「内容: 説明」')).toBe(null);
			expect(splitAtNonTimeColon('"Warning: Danger"')).toBe(null);
		});

		it('should split at colon outside quotes', () => {
			expect(splitAtNonTimeColon("Protest: Signs saying 'USA: Don't Repeat 1953'")).toEqual([
				'Protest',
				"Signs saying 'USA: Don't Repeat 1953'",
			]);

			expect(splitAtNonTimeColon('Japanese: 「内容: 説明」')).toEqual([
				'Japanese',
				'「内容: 説明」',
			]);
		});
	});
});
