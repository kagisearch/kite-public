import type { Article, Story } from '$lib/types';
import { buildCitationMapping, replaceWithNumberedCitations } from './citationContext';
import { describe, expect, it } from 'vitest';

/**
 * The citation mapping has to be built from the same text StoryListSection
 * renders. Object-shaped list items carry their citations inside a field, so if
 * the mapping skips them their markers are displayed but never numbered, and the
 * cited sources drop off the story (KNEWS-443).
 */
const ARTICLES = [
	{ title: 'Seattle shooting', link: 'https://foxnews.com/a', domain: 'foxnews.com' },
	{ title: 'Heat warning', link: 'https://reuters.com/b', domain: 'reuters.com' },
] as Article[];

function storyWith(overrides: Partial<Story>): Story {
	return { title: 'Test', short_summary: '', articles: ARTICLES, ...overrides } as Story;
}

describe('buildCitationMapping', () => {
	it('extracts citations from plain string list items', () => {
		const story = storyWith({ travel_advisory: ['Avoid the area [foxnews.com#1]'] });

		const mapping = buildCitationMapping(story, ARTICLES);

		expect(mapping.citationToNumber.has('foxnews.com#1')).toBe(true);
	});

	it('extracts citations from object-shaped list items', () => {
		const story = storyWith({
			travel_advisory: [
				{
					category: 'Safety',
					information: 'Police urged the public to avoid the area [foxnews.com#1]',
					action: 'Follow local guidance',
				},
			] as unknown as string[],
		});

		const mapping = buildCitationMapping(story, ARTICLES);

		expect(mapping.citationToNumber.has('foxnews.com#1')).toBe(true);
	});

	it('numbers the rendered text of an object item, leaving no raw markers', () => {
		const item = {
			category: 'Safety',
			information: 'Heat warnings remain active [reuters.com#1]',
			action: 'Limit midday travel',
		};
		const story = storyWith({ travel_advisory: [item] as unknown as string[] });

		const mapping = buildCitationMapping(story, ARTICLES);
		// StoryListSection renders this normalized string through the same mapping.
		const rendered = replaceWithNumberedCitations(
			'Safety: Heat warnings remain active [reuters.com#1]. Limit midday travel',
			mapping,
		);

		expect(rendered).not.toContain('[reuters.com#1]');
		expect(rendered).toMatch(/\[\d+\]/);
	});

	it('covers object items across every list field that can hold them', () => {
		const story = storyWith({
			technical_details: [
				{ name: 'Term', description: 'Explained [foxnews.com#1]' },
			] as unknown as string[],
			scientific_significance: [
				{ aspect: 'Meaning', description: 'Detail [reuters.com#1]' },
			] as unknown as string[],
			industry_impact: [
				{ area: 'Rail', description: 'Delays [foxnews.com#1]' },
			] as unknown as string[],
			user_action_items: [
				{ task: 'Check alerts', howto: 'Open settings [reuters.com#1]' },
			] as unknown as string[],
		});

		const mapping = buildCitationMapping(story, ARTICLES);

		expect(mapping.citationToNumber.has('foxnews.com#1')).toBe(true);
		expect(mapping.citationToNumber.has('reuters.com#1')).toBe(true);
	});

	it('does not throw on malformed items', () => {
		const story = storyWith({
			travel_advisory: [null, {}, 42, ['nested [foxnews.com#1]']] as unknown as string[],
		});

		expect(() => buildCitationMapping(story, ARTICLES)).not.toThrow();
	});
});
