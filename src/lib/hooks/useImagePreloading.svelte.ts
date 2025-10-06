import { onDestroy, onMount } from 'svelte';
import { imagePreloadingService } from '$lib/services/imagePreloadingService';
import type { Story } from '$lib/types';

/**
 * Hook for viewport-based image preloading using Intersection Observer
 */
export function useViewportPreloading(
	elementRef: () => HTMLElement | null,
	story: Story,
	options: { priority?: boolean } = {},
) {
	let isPreloaded = $state(false);
	let isInViewport = $state(false);
	let observer: IntersectionObserver | null = null;

	onMount(() => {
		const element = elementRef();
		if (!element) return;

		observer = imagePreloadingService.createViewportPreloader((entry) => {
			const wasInViewport = isInViewport;
			isInViewport = entry.isIntersecting;

			// Preload when entering viewport for the first time
			if (entry.isIntersecting && !wasInViewport && !isPreloaded) {
				imagePreloadingService.preloadStory(story, options).then(() => {
					isPreloaded = true;
				});
			}
		});

		if (observer) {
			observer.observe(element);
		}
	});

	onDestroy(() => {
		observer?.disconnect();
	});

	return {
		get isPreloaded() {
			return isPreloaded;
		},
		get isInViewport() {
			return isInViewport;
		},
	};
}

/**
 * Hook for hover-based preloading
 */
export function useHoverPreloading(story: Story, options: { priority?: boolean } = {}) {
	let isPreloaded = $state(false);
	let isHovered = $state(false);

	const handleMouseEnter = async () => {
		isHovered = true;
		if (isPreloaded) return;

		await imagePreloadingService.preloadStory(story, options);
		isPreloaded = true;
	};

	const handleMouseLeave = () => {
		isHovered = false;
	};

	return {
		get isPreloaded() {
			return isPreloaded;
		},
		get isHovered() {
			return isHovered;
		},
		handleMouseEnter,
		handleMouseLeave,
	};
}
