// Public version of the private layout loader: same locale detection and base
// meta tags (shared through $lib/utils/layoutLoad), without Kagi sessions,
// feature flags or the user-prefs database.
import { KN_PREFS_COOKIE } from '$lib/constants/categories';
import { parseKnPrefs } from '$lib/data/knPrefs';
import { buildBaseMetaTags, resolveLocaleStrings } from '$lib/utils/layoutLoad';

export const load = async ({ url, request, cookies }) => {
	const { primaryLocale, strings } = resolveLocaleStrings(
		cookies.get('locale') || null,
		request.headers.get('accept-language'),
	);

	return {
		// No Kagi sign-in in the public app
		session: null as App.Locals['session'],
		locale: primaryLocale,
		knPrefs: parseKnPrefs(cookies.get(KN_PREFS_COOKIE)),
		strings,
		baseMetaTags: buildBaseMetaTags(url, strings),
		showNativeAppBanner: false,
		onDemandTranslations: false,
	};
};
