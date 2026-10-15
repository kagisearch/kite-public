import type { Category } from '$lib/types';
import SinglePageModeHarness from './SinglePageModeHarness.svelte';
import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

type LoadStories = (categoryId: string, opts?: { prefetch?: boolean }) => Promise<void>;

const CATEGORIES: Category[] = [
	{ id: 'world', name: 'World' },
	{ id: 'usa', name: 'USA' },
	{ id: 'tech', name: 'Tech' },
];

// The effects run in a microtask after mount; give Svelte a tick to flush.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useSinglePageMode category loading', () => {
	let loadStoriesForCategory: Mock<LoadStories>;

	beforeEach(() => {
		loadStoriesForCategory = vi.fn<LoadStories>(async () => {});
		// Sequential mode constructs an IntersectionObserver. The shared setup
		// stubs it with an arrow function, which throws when called with `new`.
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
				takeRecords() {
					return [];
				}
			},
		);
	});

	function mount(props: Record<string, unknown> = {}) {
		return render(SinglePageModeHarness, {
			props: {
				singlePageMode: 'disabled',
				dataLoaded: true,
				orderedCategories: CATEGORIES,
				loadStoriesForCategory,
				...props,
			},
		});
	}

	it('loads every category when the mode is already enabled on first load', async () => {
		// Regression test for kite-public#583: a refresh with sequential mode
		// already persisted used to skip the bulk load entirely, leaving only the
		// category from the URL rendered.
		mount({ singlePageMode: 'sequential' });
		await flush();

		expect(loadStoriesForCategory).toHaveBeenCalledTimes(CATEGORIES.length);
		expect(loadStoriesForCategory.mock.calls.map(([id]) => id).sort()).toEqual([
			'tech',
			'usa',
			'world',
		]);
	});

	it('prefetches on first load so the in-flight primary category fetch keeps the view', async () => {
		mount({ singlePageMode: 'sequential' });
		await flush();

		expect(loadStoriesForCategory).toHaveBeenCalledTimes(CATEGORIES.length);
		for (const [, opts] of loadStoriesForCategory.mock.calls) {
			expect(opts).toEqual({ prefetch: true });
		}
	});

	it('does not load anything while the mode is disabled', async () => {
		mount({ singlePageMode: 'disabled' });
		await flush();

		expect(loadStoriesForCategory).not.toHaveBeenCalled();
	});

	it('waits for data before loading', async () => {
		const { rerender } = mount({ singlePageMode: 'sequential', dataLoaded: false });
		await flush();
		expect(loadStoriesForCategory).not.toHaveBeenCalled();

		await rerender({ singlePageMode: 'sequential', dataLoaded: true });
		await flush();
		expect(loadStoriesForCategory).toHaveBeenCalledTimes(CATEGORIES.length);
	});

	it('still loads every category when the mode is toggled on later', async () => {
		const { rerender } = mount({ singlePageMode: 'disabled' });
		await flush();
		expect(loadStoriesForCategory).not.toHaveBeenCalled();

		await rerender({ singlePageMode: 'sequential' });
		await flush();

		expect(loadStoriesForCategory).toHaveBeenCalledTimes(CATEGORIES.length);
	});
});
