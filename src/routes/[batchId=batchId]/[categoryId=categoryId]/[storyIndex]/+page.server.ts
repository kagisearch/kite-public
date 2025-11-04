import { generateStoryPageMetaTagsByIndex } from '$lib/server/meta-tags';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	console.log('=== /[batchId]/[categoryId]/[storyIndex]/+page.server.ts called ===');
	console.log('Params:', params);
	console.log('URL:', url.href);

	const { batchId, categoryId, storyIndex: storyIndexStr } = params;
	const storyIndex = parseInt(storyIndexStr, 10);
	const dataLang = url.searchParams.get('data_lang') || 'default';

	// Check if we have valid story index
	if (Number.isNaN(storyIndex) || storyIndex < 0) {
		return { pageMetaTags: {} };
	}

	// Generate story meta tags
	const pageMetaTags = await generateStoryPageMetaTagsByIndex({
		categoryId,
		batchId,
		storyIndex,
		dataLang,
	});

	return { pageMetaTags };
};
