import {
	generateCategoryPageMetaTags,
	getLatestBatchId,
} from '$lib/server/meta-tags';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	console.log('=== /[categoryId]/latest/+page.server.ts called ===');
	console.log('Params:', params);
	console.log('URL:', url.href);

	const { categoryId } = params;
	const dataLang = url.searchParams.get('data_lang') || 'default';

	// Get the latest batch ID
	const batchId = await getLatestBatchId();
	if (!batchId) {
		return { pageMetaTags: {} };
	}

	// Generate category meta tags
	const pageMetaTags = await generateCategoryPageMetaTags({
		categoryId,
		batchId,
		dataLang,
	});

	return { pageMetaTags };
};
