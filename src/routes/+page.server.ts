import { ssrPayload } from '$lib/server/ssrLoad';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = (event) => ssrPayload(event);
