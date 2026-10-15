/**
 * Pseudo-category id for the "On This Day" historical timeline. It's not a
 * real news category — the backend ships it as a flag on the batch and the
 * frontend appends it to the categories list with a fixed id. Match
 * case-insensitively because some serialization paths have used different
 * casing historically.
 */
export const ONTHISDAY_ID = 'onthisday';

export function isOnThisDay(categoryId: string): boolean {
	return categoryId.toLowerCase() === ONTHISDAY_ID;
}

/**
 * Maximum stories returned per category. The UI renders up to this many at
 * once; both the SSR seed and the on-demand stories endpoint cap at this
 * value. The public API still allows clients to override via ?limit=, up
 * to a hard ceiling enforced server-side.
 */
export const STORIES_PER_CATEGORY = 12;

/**
 * Categories enabled by default for new users (first-time setup) and used
 * as the priority order when picking an SSR fallback category for users
 * whose enabled list isn't yet known (no localStorage on the server).
 *
 * Order matters: the SSR fallback prefers earlier entries when picking the
 * server-rendered default category, so the SSR HTML matches what most users
 * actually see post-hydration. Aligned with categorySettings.initWithDefaults.
 */
export const DEFAULT_ENABLED_CATEGORIES = [
	'world',
	'usa',
	'business',
	'tech',
	'science',
	'sports',
	'gaming',
	ONTHISDAY_ID,
];

/**
 * Cookie name for the SSR-side user preferences mirror. The cookie's value
 * is a JSON-encoded KnPrefs object — see $lib/data/knPrefs for the type and
 * read/write helpers. This is a one-way mirror of the canonical localStorage
 * + remote-sync state, used purely so the server can render the user's
 * preferred category and language on first paint without a flash.
 */
export const KN_PREFS_COOKIE = 'kn_prefs';

/**
 * Build the frontend Category[] list + id→UUID map from raw DB/API rows.
 * Appends the OnThisDay pseudo-category when the batch has it.
 */
export function buildCategoryList(
	raw: Array<{ id: string; categoryId: string; categoryName: string }>,
	hasOnThisDay: boolean,
): { categories: Array<{ id: string; name: string }>; categoryMap: Record<string, string> } {
	const categoryMap: Record<string, string> = {};
	const categories = raw.map((cat) => {
		categoryMap[cat.categoryId] = cat.id;
		return { id: cat.categoryId, name: cat.categoryName };
	});
	if (hasOnThisDay) {
		categories.push({ id: ONTHISDAY_ID, name: 'On This Day' });
	}
	return { categories, categoryMap };
}
