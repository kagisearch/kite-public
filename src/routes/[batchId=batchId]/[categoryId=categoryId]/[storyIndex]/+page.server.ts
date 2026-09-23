import { generateStoryPageMetaTagsByIndex } from '$lib/server/meta-tags';
import { ssrPayload } from '$lib/server/ssrLoad';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { batchId, categoryId, storyIndex: storyIndexStr } = event.params;
	const storyIndex = parseInt(storyIndexStr, 10);
	const dataLang = event.url.searchParams.get('data_lang') || 'default';

	const [payload, pageMetaTags] = await Promise.all([
		ssrPayload(event, { batchId, categoryId }),
		!Number.isNaN(storyIndex) && storyIndex >= 0
			? generateStoryPageMetaTagsByIndex({ categoryId, batchId, storyIndex, dataLang })
			: Promise.resolve({}),
	]);

	return { ...payload, pageMetaTags };
};
