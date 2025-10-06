import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as imagePreloader from '$lib/utils/imagePreloader';
import { dataService } from '../dataService';
import { imagePreloadingService } from '../imagePreloadingService';

// Mock the dependencies
vi.mock('$lib/utils/imagePreloader', () => ({
	preloadImages: vi.fn(() => Promise.resolve()),
	extractStoryImages: vi.fn(
		(story: any) => story.articles?.map((a: any) => a.image).filter(Boolean) || [],
	),
	isImageCached: vi.fn(() => false),
	clearImageCache: vi.fn(),
	getImageCacheStats: vi.fn(() => ({
		cachedCount: 0,
		downloadingCount: 0,
		cachedImages: [],
	})),
	preloadImage: vi.fn(() => Promise.resolve()),
	cancelAllDownloads: vi.fn(),
}));

vi.mock('../dataService', () => ({
	dataService: {
		isTimeTravelMode: vi.fn(() => false),
	},
}));

vi.mock('$lib/stores/preloadingConfig.svelte', () => ({
	preloadingConfig: {
		subscribe: vi.fn(),
		enabled: true,
		enableOnMobile: false,
		categoryPreloadDelay: 500,
		storyPreloadDelay: 0,
		viewportPreloadThreshold: 0.1,
		debugLogging: false,
	},
}));

// Mock browser environment
vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	prerendering: false,
}));

describe('ImagePreloadingService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset all mocks to their initial state
		vi.mocked(imagePreloader.preloadImages).mockResolvedValue([]);
		vi.mocked(imagePreloader.isImageCached).mockReturnValue(false);
		vi.mocked(imagePreloader.extractStoryImages).mockImplementation(
			(story: any) => story.articles?.map((a: any) => a.image).filter(Boolean) || [],
		);

		// Mock dataService to not be in time travel mode
		vi.mocked(dataService.isTimeTravelMode).mockReturnValue(false);

		imagePreloadingService.clearCache();
		// Configure the service to enable preloading
		imagePreloadingService.configure({
			enabledInTimeTravelMode: true, // Allow in time travel mode for tests
			enabledOnMobile: true,
			categoryPreloadDelay: 0,
			storyPreloadDelay: 0,
			logLevel: 'none',
		});
	});

	describe('preloadCategory', () => {
		it('should preload images for a category', async () => {
			const stories = [
				{
					cluster_number: 1,
					category: 'test',
					title: 'Test Story 1',
					short_summary: 'Summary 1',
					articles: [
						{
							title: 'Article 1',
							link: 'link1',
							domain: 'domain1',
							date: '2024-01-01',
							image: 'image1.jpg',
						},
						{
							title: 'Article 2',
							link: 'link2',
							domain: 'domain2',
							date: '2024-01-01',
							image: 'image2.jpg',
						},
					],
				},
				{
					cluster_number: 2,
					category: 'test',
					title: 'Test Story 2',
					short_summary: 'Summary 2',
					articles: [
						{
							title: 'Article 3',
							link: 'link3',
							domain: 'domain3',
							date: '2024-01-01',
							image: 'image3.jpg',
						},
					],
				},
			];

			await imagePreloadingService.preloadCategory(stories);

			expect(imagePreloader.preloadImages).toHaveBeenCalledWith(
				['image1.jpg', 'image2.jpg', 'image3.jpg'],
				false,
			);
		});

		it('should skip preloading in time travel mode when configured', async () => {
			// Reconfigure to disable in time travel mode
			imagePreloadingService.configure({
				enabledInTimeTravelMode: false,
				enabledOnMobile: true,
				categoryPreloadDelay: 0,
				storyPreloadDelay: 0,
				logLevel: 'none',
			});

			vi.mocked(dataService.isTimeTravelMode).mockReturnValue(true);

			const stories = [
				{
					cluster_number: 1,
					category: 'test',
					title: 'Test Story',
					short_summary: 'Summary',
					articles: [
						{
							title: 'Article',
							link: 'link',
							domain: 'domain',
							date: '2024-01-01',
							image: 'image1.jpg',
						},
					],
				},
			];
			await imagePreloadingService.preloadCategory(stories);

			expect(imagePreloader.preloadImages).not.toHaveBeenCalled();
		});

		it('should handle already cached images', async () => {
			vi.mocked(imagePreloader.isImageCached).mockReturnValue(true);

			const stories = [
				{
					cluster_number: 1,
					category: 'test',
					title: 'Test Story',
					short_summary: 'Summary',
					articles: [
						{
							title: 'Article',
							link: 'link',
							domain: 'domain',
							date: '2024-01-01',
							image: 'cached.jpg',
						},
					],
				},
			];
			await imagePreloadingService.preloadCategory(stories);

			expect(imagePreloader.preloadImages).not.toHaveBeenCalled();
		});
	});

	describe('preloadStory', () => {
		it('should call preloadImages for story with images', async () => {
			// Create a story with unique cluster number to avoid cache conflicts
			const story = {
				cluster_number: Date.now(), // Unique cluster number
				category: 'news',
				title: 'Story with images',
				short_summary: 'Summary',
				articles: [
					{
						title: 'Article 1',
						link: 'link1',
						domain: 'domain1',
						date: '2024-01-01',
						image: 'unique1.jpg',
					},
					{
						title: 'Article 2',
						link: 'link2',
						domain: 'domain2',
						date: '2024-01-01',
						image: 'unique2.jpg',
					},
				],
			};

			// Reset everything
			vi.clearAllMocks();
			imagePreloadingService.clearCache();
			imagePreloadingService.clearPreloading();

			await imagePreloadingService.preloadStory(story, { priority: true });

			// Verify the mock was called with extracted images
			expect(imagePreloader.preloadImages).toHaveBeenCalledWith(
				['unique1.jpg', 'unique2.jpg'],
				true,
			);
		});
	});

	describe('real behavior tests', () => {
		it('should handle concurrent preloads correctly', async () => {
			const timestamp = Date.now();
			const category1 = [
				{
					cluster_number: timestamp + 1,
					category: 'cat1',
					title: 'Story 1',
					short_summary: 'Summary',
					articles: [
						{
							title: 'A',
							link: 'l',
							domain: 'd',
							date: '2024-01-01',
							image: 'cat1.jpg',
						},
					],
				},
			];

			const category2 = [
				{
					cluster_number: timestamp + 2,
					category: 'cat2',
					title: 'Story 2',
					short_summary: 'Summary',
					articles: [
						{
							title: 'B',
							link: 'l',
							domain: 'd',
							date: '2024-01-01',
							image: 'cat2.jpg',
						},
					],
				},
			];

			// Reset everything
			vi.clearAllMocks();
			imagePreloadingService.clearCache();
			imagePreloadingService.clearPreloading();

			// Start both preloads
			await Promise.all([
				imagePreloadingService.preloadCategory(category1),
				imagePreloadingService.preloadCategory(category2),
			]);

			// Both categories should have been preloaded
			expect(imagePreloader.preloadImages).toHaveBeenCalledTimes(2);
		});

		it('should handle errors without throwing', async () => {
			// Make preloadImages throw an error
			vi.mocked(imagePreloader.preloadImages).mockRejectedValueOnce(new Error('Network error'));

			const stories = [
				{
					cluster_number: 300,
					category: 'error-test',
					title: 'Test Story',
					short_summary: 'Summary',
					articles: [
						{
							title: 'Article',
							link: 'link',
							domain: 'domain',
							date: '2024-01-01',
							image: 'error.jpg',
						},
					],
				},
			];

			// Should not throw - errors are handled internally
			await expect(imagePreloadingService.preloadCategory(stories)).resolves.toBeUndefined();
		});
	});
});
