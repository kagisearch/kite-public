import Mustache from 'mustache';
import { browser } from '$app/environment';
import { page } from '$app/state';
import { language } from '$lib/stores/language.svelte.js';

export function s(key: string, view?: Record<string, string>, strict = false) {
	// Use server-side strings on server, client-side strings on client
	const strings = browser ? language.currentStrings : page.data.strings;
	let value = strings?.[key];

	if (typeof value === 'object') {
		value = value?.text;
	}

	if (!value) return strict ? undefined : key;

	return view ? Mustache.render(value, view) : value;
}
