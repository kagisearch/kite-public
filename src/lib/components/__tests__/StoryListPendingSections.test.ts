import StoryList from '../StoryList.svelte';
import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Single page mode fills categories in parallel after first paint, so the list
 * has to show a placeholder for each category still in flight — including when
 * nothing has rendered yet. The empty-state branch used to win in that case,
 * covering the whole page with "no stories" while the rest of the feed was
 * still loading (KNEWS-448).
 */
describe('StoryList pending sections', () => {
	const PENDING = [
		{ id: 'usa', name: 'USA', beforeCategoryId: null },
		{ id: 'tech', name: 'Tech', beforeCategoryId: null },
	];

	beforeEach(() => {
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

	function renderList(props: Record<string, unknown> = {}) {
		return render(StoryList, {
			props: {
				stories: [],
				currentCategory: 'all',
				showCategoryLabels: true,
				skipStoryCountLimit: true,
				...props,
			},
		});
	}

	it('renders a placeholder per pending category when nothing has loaded yet', () => {
		const { container } = renderList({ pendingSections: PENDING });

		const placeholders = container.querySelectorAll('[data-pending-category-id]');
		expect(
			Array.from(placeholders).map((el) => el.getAttribute('data-pending-category-id')),
		).toEqual(['usa', 'tech']);
		expect(container.textContent).toContain('USA');
		expect(container.textContent).toContain('Tech');
	});

	// Locale strings aren't loaded under JSDOM, so `s()` echoes the key back.
	const EMPTY_STATE_KEY = 'stories.noStoriesCoreUpdates';

	it('does not show the empty state while categories are still pending', () => {
		const { container } = renderList({ pendingSections: PENDING });

		expect(container.textContent).not.toContain(EMPTY_STATE_KEY);
	});

	it('still shows the empty state once nothing is pending', () => {
		const { container } = renderList({ pendingSections: [] });

		expect(container.querySelectorAll('[data-pending-category-id]')).toHaveLength(0);
		expect(container.textContent).toContain(EMPTY_STATE_KEY);
	});

	it('keeps placeholders out of the category-header selector the URL observer watches', () => {
		// A placeholder must not drive the sequential-mode URL to a category
		// whose stories haven't arrived.
		const { container } = renderList({ pendingSections: PENDING });

		expect(container.querySelectorAll('.category-section-header[data-category-id]')).toHaveLength(
			0,
		);
	});
});
