import StoryListSection from '../story/StoryListSection.svelte';
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

/**
 * Every story bullet section renders through StoryListSection, so normalizing
 * here is what keeps object-shaped LLM items from reaching the DOM as
 * "[object Object]" or throwing inside citation processing (KNEWS-443).
 */
describe('StoryListSection', () => {
	const OBJECT_ITEMS = [
		{
			category: 'Safety',
			information: 'Heat warnings remain active',
			action: 'Limit midday travel',
		},
		{
			category: 'Transport',
			information: 'Rail speed restrictions apply',
			action: 'Allow extra time',
		},
	];

	it('renders plain string items unchanged', () => {
		const { container } = render(StoryListSection, {
			props: { title: 'Travel Advisory', items: ['Avoid the area until it reopens'] },
		});

		expect(container.textContent).toContain('Avoid the area until it reopens');
	});

	it('flattens object items instead of rendering [object Object]', () => {
		const { container } = render(StoryListSection, {
			props: { title: 'Travel Advisory', items: OBJECT_ITEMS },
		});

		expect(container.textContent).not.toContain('[object Object]');
		expect(container.textContent).toContain(
			'Safety: Heat warnings remain active. Limit midday travel',
		);
		expect(container.querySelectorAll('li')).toHaveLength(2);
	});

	it('flattens object items when a citation mapping is present', () => {
		// This is the path that previously threw: replaceWithNumberedCitations
		// calls string methods, so an object item took the page down mid-render.
		const { container } = render(StoryListSection, {
			props: {
				title: 'Travel Advisory',
				items: OBJECT_ITEMS,
				citationMapping: {
					citationToNumber: new Map<string, number>(),
					numberToArticle: new Map(),
					totalCitations: 0,
				},
			},
		});

		expect(container.textContent).not.toContain('[object Object]');
		expect(container.textContent).toContain('Safety: Heat warnings remain active');
	});

	it('drops items that normalize to nothing rather than rendering empty bullets', () => {
		const { container } = render(StoryListSection, {
			props: { title: 'Travel Advisory', items: ['Real advisory', {}, null, ''] },
		});

		expect(container.querySelectorAll('li')).toHaveLength(1);
	});

	it('survives a non-array items value', () => {
		const { container } = render(StoryListSection, {
			props: { title: 'Travel Advisory', items: { not: 'an array' } },
		});

		expect(container.querySelectorAll('li')).toHaveLength(0);
		expect(container.textContent).not.toContain('[object Object]');
	});
});
