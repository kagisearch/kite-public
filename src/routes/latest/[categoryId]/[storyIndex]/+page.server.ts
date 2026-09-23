import { generateStoryPageMetaTagsByIndex } from '$lib/server/meta-tags';
import { ssrPayload } from '$lib/server/ssrLoad';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { categoryId, storyIndex: storyIndexStr } = event.params;
	const storyIndex = parseInt(storyIndexStr, 10);
	const dataLang = event.url.searchParams.get('data_lang') || 'default';

	const payload = await ssrPayload(event, { categoryId });

	const pageMetaTags =
		payload.initialData && !Number.isNaN(storyIndex) && storyIndex >= 0
			? await generateStoryPageMetaTagsByIndex({
					categoryId,
					batchId: payload.initialData.batchId,
					storyIndex,
					dataLang,
				})
			: {};

	return { ...payload, pageMetaTags };
};
