import { ssrPayload } from '$lib/server/ssrLoad';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { batchId } = event.params;

	// Static asset routes that nginx is meant to serve directly. Returning
	// 404 here lets it fall through to the static handler.
	if (batchId.endsWith('.xml') || batchId.endsWith('.json')) {
		error(404, 'Not found');
	}

	return ssrPayload(event, { batchId });
};
