import type { Category, Story } from '$lib/types';
import { filterStories } from './contentFilter';
import { orderStoriesForSinglePage } from './storyOrdering';
import { describe, expect, it } from 'vitest';

function story(id: string, title: string): Story {
	return { id, title, short_summary: '', category: '' } as Story;
}

// Two categories of 6, where the first three of each match the filter.
const CATEGORIES = [
	{ id: 'world', name: 'World' },
	{ id: 'tech', name: 'Tech' },
] as Category[];

const ALL_STORIES: Record<string, Story[]> = {
	world: [
		story('w1', 'Football opener'),
		story('w2', 'Football final'),
		story('w3', 'Football transfer'),
		story('w4', 'Election result'),
		story('w5', 'Storm warning'),
		story('w6', 'Treaty signed'),
	],
	tech: [
		story('t1', 'Football streaming deal'),
		story('t2', 'Football app launch'),
		story('t3', 'Football analytics'),
		story('t4', 'Chip shortage'),
		story('t5', 'Browser release'),
		story('t6', 'Data centre build'),
	],
};

const pickFiltered = (stories: Story[], limit: number) =>
	filterStories(stories, ['football'], 'title', 'hide', limit).filtered;

describe('orderStoriesForSinglePage', () => {
	it('takes the plain head of each category when given no selector', () => {
		const result = orderStoriesForSinglePage(ALL_STORIES, CATEGORIES, 'sequential', 2);

		expect(result.map((s) => s.id)).toEqual(['w1', 'w2', 't1', 't2']);
	});

	it('backfills past filtered stories so each category still reaches its count', () => {
		const result = orderStoriesForSinglePage(
			ALL_STORIES,
			CATEGORIES,
			'sequential',
			2,
			pickFiltered,
		);

		expect(result.map((s) => s.id)).toEqual(['w4', 'w5', 't4', 't5']);
	});

	it('keeps the per-category count in mixed mode', () => {
		const result = orderStoriesForSinglePage(ALL_STORIES, CATEGORIES, 'mixed', 2, pickFiltered);

		// Interleaved: 1st of each category, then 2nd of each.
		expect(result.map((s) => s.id)).toEqual(['w4', 't4', 'w5', 't5']);
	});

	it('includes every story from a category once the selector runs out', () => {
		const scarce = { world: ALL_STORIES.world.slice(0, 4) };
		const result = orderStoriesForSinglePage(
			scarce,
			[CATEGORIES[0]],
			'sequential',
			3,
			pickFiltered,
		);

		// Only w4 survives the filter, so the category is short rather than padded.
		expect(result.map((s) => s.id)).toEqual(['w4']);
	});

	it('ignores the selector when there is no per-category limit', () => {
		const result = orderStoriesForSinglePage(ALL_STORIES, CATEGORIES, 'sequential', null, () => []);

		expect(result).toHaveLength(12);
	});

	it('tags each story with its category', () => {
		const result = orderStoriesForSinglePage(
			ALL_STORIES,
			CATEGORIES,
			'sequential',
			1,
			pickFiltered,
		);

		expect(result.map((s) => [s._categoryId, s._categoryName])).toEqual([
			['world', 'World'],
			['tech', 'Tech'],
		]);
	});
});
