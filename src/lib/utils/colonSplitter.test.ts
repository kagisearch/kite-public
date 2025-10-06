import { describe, expect, it } from 'vitest';
import { findNonTimeColon, splitAtNonTimeColon } from './colonSplitter';

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
	});
});
