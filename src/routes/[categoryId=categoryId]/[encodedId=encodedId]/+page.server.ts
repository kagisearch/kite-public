import { ssrPayload } from '$lib/server/ssrLoad';
import { decodeBatchId } from '$lib/utils/urlEncoder';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	// encodedId is YYYYMMDDS — decode to a date slug then load that batch.
	// `latest` is the special case that resolves to the most recent batch.
	const batchId =
		event.params.encodedId === 'latest'
			? undefined
			: (decodeBatchId(event.params.encodedId) ?? undefined);
	return ssrPayload(event, { batchId, categoryId: event.params.categoryId });
};
