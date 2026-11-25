import type { OnThisDayEvent, Story } from '$lib/types';
import { removeCitationMarkers } from './citationUtils';

// Extended Story type for content filtering
export interface FilteredStory extends Story {
	_filtered?: boolean;
	_matchedKeywords?: string[];
}

// Extended OnThisDayEvent type for content filtering
export interface FilteredOnThisDayEvent extends OnThisDayEvent {
	_filtered?: boolean;
	_matchedKeywords?: string[];
}

interface FilterResult {
	shouldFilter: boolean;
	matchedKeywords: string[];
}

/**
 * A keyword shaped like a hostname (`dailymail.co.uk`, `bild.de`) names a
 * source rather than a topic. Only these are compared against where a story
 * came from; every keyword is compared against what the story says. A leading
 * or trailing dot ("u.s.", ".net") marks an ordinary content keyword.
 */
const HOSTNAME_KEYWORD = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

function stripWww(host: string): string {
	return host.toLowerCase().replace(/^www\./, '');
}

function hostnameOf(url: string): string | null {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

/**
 * Hosts a story was sourced from. The backend stores the registered domain
 * (`postimees.ee`) in `domain`, so the link's full host (`elu24.postimees.ee`)
 * is collected too; a subdomain-specific keyword can only match through it.
 */
function storySourceHosts(story: Story): string[] {
	const hosts = new Set<string>();
	if (Array.isArray(story.domains)) {
		for (const d of story.domains) {
			if (d?.name) hosts.add(stripWww(d.name));
		}
	}
	if (Array.isArray(story.articles)) {
		for (const a of story.articles) {
			if (a?.domain) hosts.add(stripWww(a.domain));
			const linkHost = a?.link ? hostnameOf(a.link) : null;
			if (linkHost) hosts.add(stripWww(linkHost));
		}
	}
	return [...hosts];
}

/**
 * `dailymail.co.uk` matches `dailymail.co.uk` and `news.dailymail.co.uk`.
 * A bare word never matches a host, so `agi` does not hide `agi.it`.
 */
function hostMatchesKeyword(host: string, keyword: string): boolean {
	return host === keyword || host.endsWith(`.${keyword}`);
}

/**
 * Story text with inline citation markers such as `[agi.it#1]` removed, so a
 * keyword can only match what the story says, never which source said it.
 */
function contentText(value: string | null | undefined): string {
	return removeCitationMarkers(value || '').toLowerCase();
}

/**
 * Check if a story should be filtered based on keywords.
 *
 * Keywords match the story's own text: title, sub-category, summary and (in
 * the "all" scope) perspectives. Source names, domains, article URLs and the
 * citation markers embedded in summaries are deliberately not part of that
 * text — a topic keyword such as `agi` used to hide every story sourced from
 * agi.it (Agenzia Italia). Sources are matched only by hostname-shaped
 * keywords, which is what the Tabloid Sources preset relies on.
 */
export function shouldFilterStory(
	story: Story,
	keywords: string[],
	scope: 'title' | 'summary' | 'all',
): FilterResult {
	if (!keywords || keywords.length === 0) {
		return { shouldFilter: false, matchedKeywords: [] };
	}

	const matchedKeywords: string[] = [];

	// Normalize keywords for case-insensitive matching
	const normalizedKeywords = keywords.map((k) => k.toLowerCase());

	// Build the text to check based on scope
	let textToCheck = '';

	if (scope === 'title' || scope === 'all') {
		textToCheck += `${contentText(story.title)} `;
		// Also check the sub-category field when checking title
		textToCheck += `${contentText(story.category)} `;
	}

	if (scope === 'summary' || scope === 'all') {
		textToCheck += `${contentText(story.short_summary)} `;
	}

	// Production data can carry `null` entries in `perspectives`.
	if (scope === 'all' && Array.isArray(story.perspectives)) {
		for (const p of story.perspectives) {
			textToCheck += `${contentText(p?.text)} `;
		}
	}

	// Sources are only consulted in the "all" scope, and only when at least one
	// keyword can match a host, so the common case does no extra work.
	const hasSourceKeyword =
		scope === 'all' && normalizedKeywords.some((k) => HOSTNAME_KEYWORD.test(k));
	const sourceHosts = hasSourceKeyword ? storySourceHosts(story) : [];

	// Check each keyword with whole word matching
	for (const keyword of normalizedKeywords) {
		// Special regex characters in keywords are escaped to prevent ReDoS
		const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Check if keyword starts/ends with word characters (letters, digits, underscore)
		const startsWithWordChar = /^\w/.test(keyword);
		const endsWithWordChar = /\w$/.test(keyword);

		// Build appropriate boundary patterns:
		// - For word chars: use \b (standard word boundary)
		// - For non-word chars (like periods in "u.s."): use lookahead/lookbehind
		//   to match at string edges or when adjacent to non-word characters
		// This fixes matching "u.s." in "U.S. adults" where the trailing period
		// is followed by a space (two non-word chars have no word boundary between them)
		const startBoundary = startsWithWordChar ? '\\b' : '(?:^|(?<=[^\\w]))';
		const endBoundary = endsWithWordChar ? '\\b' : '(?:$|(?=[^\\w]))';

		// nosemgrep: detect-non-literal-regexp - keyword is escaped above, safe from ReDoS
		const regex = new RegExp(`${startBoundary}${escapedKeyword}${endBoundary}`, 'i');

		const matchesSource =
			sourceHosts.length > 0 &&
			HOSTNAME_KEYWORD.test(keyword) &&
			sourceHosts.some((host) => hostMatchesKeyword(host, stripWww(keyword)));

		if (regex.test(textToCheck) || matchesSource) {
			matchedKeywords.push(keyword);
		}
	}

	return {
		shouldFilter: matchedKeywords.length > 0,
		matchedKeywords,
	};
}

/**
 * Filter an array of stories based on content filter settings
 *
 * Pass `limit` to select from the whole pool rather than filtering a slice of
 * it. Slicing first leaves gaps: a category set to 6 stories shows fewer than 6
 * whenever the filter removes any of those first 6, even though unfiltered
 * stories are available further down. With a limit, hidden stories are
 * backfilled from the rest of the pool so the configured count is met whenever
 * enough unfiltered stories exist.
 *
 * `hidden` then holds only the stories passed over on the way to reaching
 * `limit`. Stories beyond that cutoff were never going to be displayed, so
 * counting them would inflate the "N stories hidden" indicator.
 *
 * In blur mode filtered stories stay visible and so still occupy slots, which
 * makes a limited call equivalent to filtering a plain slice.
 */
export function filterStories(
	stories: Story[],
	keywords: string[],
	scope: 'title' | 'summary' | 'all',
	filterMode: 'hide' | 'blur',
	limit: number | null = null,
): { filtered: FilteredStory[]; hidden: Story[]; filteredCount: number } {
	// `filtered.length >= NaN` is always false, which would silently return the
	// whole pool. Treat any non-finite limit as "no limit" instead.
	const effectiveLimit = limit !== null && Number.isFinite(limit) ? limit : null;

	if (!keywords || keywords.length === 0) {
		return {
			filtered: effectiveLimit === null ? stories : stories.slice(0, effectiveLimit),
			hidden: [],
			filteredCount: 0,
		};
	}

	const filtered: FilteredStory[] = [];
	const hidden: Story[] = [];

	for (const story of stories) {
		if (effectiveLimit !== null && filtered.length >= effectiveLimit) {
			break;
		}

		const { shouldFilter, matchedKeywords } = shouldFilterStory(story, keywords, scope);

		if (shouldFilter) {
			if (filterMode === 'hide') {
				hidden.push(story);
			} else {
				// For blur mode, add metadata about why it was filtered
				filtered.push({
					...story,
					_filtered: true,
					_matchedKeywords: matchedKeywords,
				} as Story & { _filtered: boolean; _matchedKeywords: string[] });
			}
		} else {
			// Clean any existing filter metadata when story no longer matches
			const cleanStory: FilteredStory = { ...story };
			delete cleanStory._filtered;
			delete cleanStory._matchedKeywords;
			filtered.push(cleanStory);
		}
	}

	return {
		filtered,
		hidden,
		filteredCount:
			hidden.length + (filterMode === 'blur' ? filtered.filter((s) => s._filtered).length : 0),
	};
}

/**
 * Check if a plain text string matches any filter keywords.
 * Used for non-Story content like OnThisDay events.
 */
export function shouldFilterText(text: string, keywords: string[]): FilterResult {
	if (!keywords || keywords.length === 0 || !text) {
		return { shouldFilter: false, matchedKeywords: [] };
	}

	const matchedKeywords: string[] = [];
	const lowerText = text.toLowerCase();

	for (const keyword of keywords) {
		const normalizedKeyword = keyword.toLowerCase();
		const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		const startsWithWordChar = /^\w/.test(normalizedKeyword);
		const endsWithWordChar = /\w$/.test(normalizedKeyword);

		const startBoundary = startsWithWordChar ? '\\b' : '(?:^|(?<=[^\\w]))';
		const endBoundary = endsWithWordChar ? '\\b' : '(?:$|(?=[^\\w]))';

		// nosemgrep: detect-non-literal-regexp - keyword is escaped above, safe from ReDoS
		const regex = new RegExp(`${startBoundary}${escapedKeyword}${endBoundary}`, 'i');

		if (regex.test(lowerText)) {
			matchedKeywords.push(keyword);
		}
	}

	return { shouldFilter: matchedKeywords.length > 0, matchedKeywords };
}

/**
 * Strip HTML tags from a string to get plain text for filtering
 */
function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, ' ');
}

/**
 * Filter OnThisDay events based on content filter keywords
 */
export function filterOnThisDayEvents(
	events: OnThisDayEvent[],
	keywords: string[],
	filterMode: 'hide' | 'blur',
): { filtered: FilteredOnThisDayEvent[]; filteredCount: number } {
	if (!keywords || keywords.length === 0) {
		return { filtered: events, filteredCount: 0 };
	}

	const filtered: FilteredOnThisDayEvent[] = [];
	let filteredCount = 0;

	for (const event of events) {
		const textToCheck = `${event.year} ${stripHtml(event.content)}`;
		const { shouldFilter, matchedKeywords } = shouldFilterText(textToCheck, keywords);

		if (shouldFilter) {
			filteredCount++;
			if (filterMode === 'blur') {
				filtered.push({ ...event, _filtered: true, _matchedKeywords: matchedKeywords });
			}
			// hide mode: skip the event entirely
		} else {
			filtered.push(event);
		}
	}

	return { filtered, filteredCount };
}
