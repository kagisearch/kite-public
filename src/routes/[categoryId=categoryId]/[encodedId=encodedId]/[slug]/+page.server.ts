import { generateStoryPageMetaTagsByEncodedId } from '$lib/server/meta-tags';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { categoryId, encodedId, slug } = params;
	const dataLang = url.searchParams.get('data_lang') || 'default';

	// Generate story meta tags
	const pageMetaTags = await generateStoryPageMetaTagsByEncodedId({
		categoryId,
		encodedId,
		slug,
		dataLang,
	});

	return { pageMetaTags };
};
