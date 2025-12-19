import type { MetaTagsProps } from 'svelte-meta-tags';
import { getCategoriesForBatch, getStoriesForCategory } from '$lib/server/db/queries';
import { generateCategoryMetaTags } from '$lib/server/opengraph';
import type { Story } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	console.log('=== [categoryId]/+page.server.ts called ===');
	console.log('Params:', params);
	console.log('URL:', url.href);

	// Default page meta tags
	let pageMetaTags: MetaTagsProps = {};

	const { batchId, categoryId } = params;

	try {
		// Get data language from query params
		const dataLang = url.searchParams.get('data_lang') || 'default';

		// Find the actual database ID for this category
		const categories = await getCategoriesForBatch(batchId, dataLang);
		const category = categories.find((cat) => cat.categoryId === categoryId);

		if (!category) {
			console.log('Category not found for slug:', categoryId);
			return { pageMetaTags };
		}

		console.log('Found category:', {
			slug: category.categoryId,
			dbId: category.id,
			name: category.categoryName,
		});

		// Get the first few stories to create a summary
		const result = await getStoriesForCategory(
			category.id,
			dataLang,
			3, // Just get first 3 stories for the description
			0,
		);

		// Build category-specific meta tags
		pageMetaTags = generateCategoryMetaTags({
			categoryName: category.categoryName,
			displayName: category.displayName,
			stories: (result?.stories || []) as Story[],
			dataLang,
		});

		console.log('Category meta tags:', {
			title: pageMetaTags.title,
			hasImage: !!pageMetaTags.openGraph?.images?.[0],
		});
	} catch (error) {
		console.error('Error fetching category for meta tags:', error);
		// Continue with default tags
	}

	console.log('Returning pageMetaTags for category');

	return {
		pageMetaTags,
	};
};
