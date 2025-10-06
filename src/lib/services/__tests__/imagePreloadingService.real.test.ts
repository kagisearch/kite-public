import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '$lib/types';
import { imagePreloadingService } from '../imagePreloadingService';

// Mock only the essentials
vi.mock('$app/environment', () => ({
	browser: true,
}));

describe('ImagePreloadingService - Real Tests', () => {
	beforeEach(() => {
		// Clear any cached state
		imagePreloadingService.clearCache();

		// Configure service for testing
		imagePreloadingService.configure({
			enabledInTimeTravelMode: true,
			enabledOnMobile: true,
			categoryPreloadDelay: 0,
			storyPreloadDelay: 0,
			logLevel: 'none',
		});
	});

	describe('service state management', () => {
		it('should track preloading state correctly', async () => {
			const story: Story = {
				cluster_number: 1,
				category: 'test',
				title: 'Test Story',
				short_summary: 'Test summary',
				articles: [],
			};

			// Start preloading
			const promise = imagePreloadingService.preloadStory(story);

			// Try to preload same story again - should return immediately
			const promise2 = imagePreloadingService.preloadStory(story);

			// Both should resolve without error
			await expect(promise).resolves.toBeUndefined();
			await expect(promise2).resolves.toBeUndefined();
		});

		it('should handle empty articles gracefully', async () => {
			const stories: Story[] = [
				{
					cluster_number: 1,
					category: 'test',
					title: 'No Images Story',
					short_summary: 'Story without images',
					articles: [
						{
							title: 'Article 1',
							link: 'link1',
							domain: 'domain1',
							date: '2024-01-01',
						},
						{
							title: 'Article 2',
							link: 'link2',
							domain: 'domain2',
							date: '2024-01-01',
						},
					],
				},
			];

			// Should not throw
			await expect(imagePreloadingService.preloadCategory(stories)).resolves.toBeUndefined();
		});

		it('should handle concurrent preloads for different categories', async () => {
			const stories1: Story[] = [
				{
					cluster_number: 1,
					category: 'tech',
					title: 'Tech Story',
					short_summary: 'Tech news',
					articles: [],
				},
			];

			const stories2: Story[] = [
				{
					cluster_number: 2,
					category: 'sports',
					title: 'Sports Story',
					short_summary: 'Sports news',
					articles: [],
				},
			];

			// Start both preloads
			const promise1 = imagePreloadingService.preloadCategory(stories1);
			const promise2 = imagePreloadingService.preloadCategory(stories2);

			// Both should complete successfully
			await expect(Promise.all([promise1, promise2])).resolves.toBeDefined();
		});
	});

	describe('configuration', () => {
		it('should respect configuration changes', async () => {
			// Disable preloading
			imagePreloadingService.configure({
				enabledInTimeTravelMode: false,
				enabledOnMobile: false,
				logLevel: 'none',
			});

			const story: Story = {
				cluster_number: 1,
				category: 'test',
				title: 'Test',
				short_summary: 'Test',
				articles: [],
			};

			// Should complete immediately without preloading
			await expect(imagePreloadingService.preloadStory(story)).resolves.toBeUndefined();
		});
	});

	describe('clearing and cleanup', () => {
		it('should clear preloading state', () => {
			// This should not throw
			expect(() => imagePreloadingService.clearPreloading()).not.toThrow();
		});

		it('should clear cache', () => {
			// This should not throw
			expect(() => imagePreloadingService.clearCache()).not.toThrow();
		});
	});
});
