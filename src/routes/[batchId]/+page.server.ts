import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { batchId } = params;

	// Check if the request is for an XML file
	if (batchId.endsWith('.xml')) {
		// Return 404 to let nginx serve the static file
		error(404, 'Not found');
	}

	// Check if the request is for other static files that should be served by nginx
	if (batchId.endsWith('.json')) {
		// Return 404 to let nginx serve the static file
		error(404, 'Not found');
	}

	// No page-specific meta tags for batch-only URLs
	return {};
};
