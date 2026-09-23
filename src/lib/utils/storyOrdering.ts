import type { SinglePageMode } from '$lib/data/settings.svelte';
import type { Category, Story } from '$lib/types';

export interface StoryWithCategory extends Story {
	_categoryId: string;
	_categoryName: string;
}

/**
 * Orders stories across multiple categories based on the selected single page mode
 */
export function orderStoriesForSinglePage(
	allCategoryStories: Record<string, Story[]>,
	orderedCategories: Category[],
	mode: SinglePageMode,
	storyCountOverride: number | null = null,
	/**
	 * How to take `limit` stories out of a category. Defaults to the plain head of
	 * the list; the caller passes a content-filter-aware picker so hidden stories
	 * are backfilled from further down instead of leaving the category short
	 * (KNEWS-441). Kept as a callback so this module stays independent of the
	 * filter store.
	 */
	selectStories: (stories: Story[], limit: number) => Story[] = (stories, limit) =>
		stories.slice(0, limit),
): StoryWithCategory[] {
	if (mode === 'disabled') {
		return [];
	}

	const result: StoryWithCategory[] = [];
	const take = (stories: Story[]) =>
		storyCountOverride ? selectStories(stories, storyCountOverride) : stories;

	// Filter to only enabled categories and respect story count
	const enabledCategories = orderedCategories.filter(
		(cat) => allCategoryStories[cat.id] && allCategoryStories[cat.id].length > 0,
	);

	if (enabledCategories.length === 0) {
		return [];
	}

	switch (mode) {
		case 'sequential': {
			// All stories from first category, then all from second, etc.
			for (const category of enabledCategories) {
				const categoryStories = allCategoryStories[category.id] || [];
				const storiesToAdd = take(categoryStories);

				for (const story of storiesToAdd) {
					result.push({
						...story,
						_categoryId: category.id,
						_categoryName: category.name,
					});
				}
			}
			break;
		}

		case 'mixed': {
			// Interleave stories: 1st from each category, then 2nd from each, etc.
			const maxStories = Math.max(
				...enabledCategories.map((cat) => {
					return take(allCategoryStories[cat.id] || []).length;
				}),
			);

			for (let i = 0; i < maxStories; i++) {
				for (const category of enabledCategories) {
					const categoryStories = allCategoryStories[category.id] || [];
					const effectiveStories = take(categoryStories);

					if (i < effectiveStories.length) {
						result.push({
							...effectiveStories[i],
							_categoryId: category.id,
							_categoryName: category.name,
						});
					}
				}
			}
			break;
		}

		case 'random': {
			// Collect all stories first
			const allStories: StoryWithCategory[] = [];
			for (const category of enabledCategories) {
				const categoryStories = allCategoryStories[category.id] || [];
				const storiesToAdd = take(categoryStories);

				for (const story of storiesToAdd) {
					allStories.push({
						...story,
						_categoryId: category.id,
						_categoryName: category.name,
					});
				}
			}

			// Fisher-Yates shuffle
			for (let i = allStories.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[allStories[i], allStories[j]] = [allStories[j], allStories[i]];
			}

			result.push(...allStories);
			break;
		}
	}

	return result;
}
