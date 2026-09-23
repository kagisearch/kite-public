// Public version: the private loader also builds meta tags from the database.
import { ssrPayload } from '$lib/server/ssrLoad';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const { batchId, categoryId } = event.params;
	return ssrPayload(event, { batchId, categoryId });
};
