// Public replacement for the private ssrLoad (which reads the database).
// Builds the same first-paint seed over HTTP through the proxied /api routes,
// so every news page renders stories without a database.
import type { ServerLoadEvent } from '@sveltejs/kit';
import { DEFAULT_ENABLED_CATEGORIES, isOnThisDay, KN_PREFS_COOKIE } from '$lib/constants/categories';
import { parseKnPrefs } from '$lib/data/knPrefs';
import { fetchSeed } from '$lib/data/seedLoader';
import type { SeedData } from '$lib/types/seed';

export async function ssrPayload(
	event: Pick<ServerLoadEvent, 'fetch' | 'cookies'>,
	opts: { batchId?: string; categoryId?: string } = {},
): Promise<{ initialData: SeedData | null }> {
	const knPrefs = parseKnPrefs(event.cookies.get(KN_PREFS_COOKIE));
	const enabled = knPrefs?.enabled ?? [...DEFAULT_ENABLED_CATEGORIES];

	// Same resolution as the private seed builder: URL category, then the
	// first enabled non-OnThisDay category, then the defaults
	const preferredCategory =
		(opts.categoryId && !isOnThisDay(opts.categoryId) ? opts.categoryId : undefined) ??
		enabled.find((id) => !isOnThisDay(id)) ??
		DEFAULT_ENABLED_CATEGORIES[0];

	const initialData = await fetchSeed(event.fetch, {
		batchId: opts.batchId,
		lang: knPrefs?.dataLang,
		currentCategory: preferredCategory,
	});
	if (initialData) {
		initialData.preferredCategory = preferredCategory;
		initialData.enabled = enabled;
		if (knPrefs?.contentFilter) {
			initialData.contentFilter = knPrefs.contentFilter;
		}
		if (knPrefs?.experimental) {
			initialData.experimental = knPrefs.experimental;
		}
	}
	return { initialData };
}
