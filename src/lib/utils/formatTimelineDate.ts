/**
 * Format a timeline date for display using Intl.DateTimeFormat.
 *
 * Detects precision from the ISO string:
 * - "YYYY-MM-DD" → day + month (+ year only if different from batch)
 * - "YYYY-MM"    → month (+ year only if different from batch)
 * - "YYYY"       → year always shown
 *
 * Uses day-first ordering for region-agnostic readability
 * (e.g., "12 February 2026" not "February 12, 2026").
 *
 * Falls back to originalDate when dateIso is missing or invalid.
 */
export function formatTimelineDate(
	dateIso: string | undefined,
	originalDate: string,
	locale: string,
	batchYear: number,
): string {
	if (!dateIso) {
		return originalDate;
	}

	const precision = detectPrecision(dateIso);
	if (!precision) {
		return originalDate;
	}

	try {
		if (precision === 'year') {
			return dateIso;
		}

		if (precision === 'month') {
			const [year, month] = dateIso.split('-').map(Number);
			const date = new Date(Date.UTC(year, month - 1, 1));
			const showYear = year !== batchYear;
			const monthName = new Intl.DateTimeFormat(locale, {
				month: 'long',
				timeZone: 'UTC',
			}).format(date);
			return showYear ? `${monthName} ${year}` : monthName;
		}

		// Full date: YYYY-MM-DD — day-first ordering
		const [year, month, day] = dateIso.split('-').map(Number);
		const date = new Date(Date.UTC(year, month - 1, day));
		const showYear = year !== batchYear;
		const parts = new Intl.DateTimeFormat(locale, {
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC',
		}).formatToParts(date);
		const monthName = parts.find((p) => p.type === 'month')?.value ?? '';
		const dayStr = parts.find((p) => p.type === 'day')?.value ?? String(day);
		return showYear ? `${dayStr} ${monthName} ${year}` : `${dayStr} ${monthName}`;
	} catch {
		return originalDate;
	}
}

type Precision = 'full' | 'month' | 'year' | null;

function detectPrecision(dateIso: string): Precision {
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return 'full';
	if (/^\d{4}-\d{2}$/.test(dateIso)) return 'month';
	if (/^\d{4}$/.test(dateIso)) return 'year';
	return null;
}
