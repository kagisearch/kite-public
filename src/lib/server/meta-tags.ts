// Public replacement for the private meta-tags module (which reads the
// database). Pages fall back to the base meta tags from +layout.server.ts.
import type { MetaTagsProps } from 'svelte-meta-tags';

export async function generateCategoryPageMetaTags(_options: unknown): Promise<MetaTagsProps> {
	return {};
}

export async function generateStoryPageMetaTagsByIndex(_options: unknown): Promise<MetaTagsProps> {
	return {};
}

export async function generateStoryPageMetaTagsByEncodedId(_options: unknown): Promise<MetaTagsProps> {
	return {};
}

export async function getLatestBatchId(): Promise<string | null> {
	return null;
}
