import { generateCategoryPageMetaTags } from '$lib/server/meta-tags';
import { ssrPayload } from '$lib/server/ssrLoad';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { categoryId } = event.params;
	const dataLang = event.url.searchParams.get('data_lang') || 'default';

	const payload = await ssrPayload(event, { categoryId });

	const pageMetaTags = payload.initialData
		? await generateCategoryPageMetaTags({
				categoryId,
				batchId: payload.initialData.batchId,
				dataLang,
			})
		: {};

	return { ...payload, pageMetaTags };
};
