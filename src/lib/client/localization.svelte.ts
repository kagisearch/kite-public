import { browser } from '$app/environment';
import { page } from '$app/state';
import { language } from '$lib/stores/language.svelte.js';
import Mustache from 'mustache';

export function s(key: string, view?: Record<string, string>, strict?: false): string;
export function s(
	key: string,
	view: Record<string, string> | undefined,
	strict: true,
): string | undefined;
export function s(key: string, view?: Record<string, string>, strict = false): string | undefined {
	// On the server we always read from `page.data.strings` (SSR'd locale).
	// On the client we prefer the dynamic store (`language.currentStrings`)
	// because it follows runtime locale switches — but it starts empty until
	// `+layout.svelte`'s `onMount` calls `language.initStrings(data.strings)`,
	// and child-component first-paint runs before that.
	const strings = browser ? language.currentStrings : page.data.strings;
	let value = strings?.[key];

	// Fall back to `page.data.strings` (the same payload the SSR used) when
	// the client lookup misses, so non-strict callers don't briefly render
	// the literal key during the pre-`initStrings` window. Guarded by
	// `value === undefined` so the happy path stays a single lookup — no
	// `Object.keys` scan in the hot rendering path.
	if (browser && value === undefined && strings !== page.data.strings) {
		value = page.data.strings?.[key];
	}

	if (typeof value === 'object') {
		value = value?.text;
	}

	if (!value) return strict ? undefined : key;

	return view ? Mustache.render(value, view) : value;
}
