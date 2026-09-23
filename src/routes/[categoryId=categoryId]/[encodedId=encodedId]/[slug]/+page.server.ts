import { generateStoryPageMetaTagsByEncodedId } from '$lib/server/meta-tags';
import { ssrPayload } from '$lib/server/ssrLoad';
import { decodeArticleId } from '$lib/utils/urlEncoder';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { categoryId, encodedId, slug } = event.params;
	const dataLang = event.url.searchParams.get('data_lang') || 'default';

	// encodedId is YYYYMMDDS<cluster> — decode the article ID to get the
	// underlying batch slug for the SSR seed.
	const batchId = decodeArticleId(encodedId)?.batchId ?? undefined;

	const [payload, pageMetaTags] = await Promise.all([
		ssrPayload(event, { batchId, categoryId }),
		generateStoryPageMetaTagsByEncodedId({ categoryId, encodedId, slug, dataLang }),
	]);

	return { ...payload, pageMetaTags };
};
