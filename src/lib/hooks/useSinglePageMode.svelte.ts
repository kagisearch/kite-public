import { browser } from '$app/environment';
import type { SinglePageMode } from '$lib/data/settings.svelte';
import type { Category } from '$lib/types';
import type { HistoryManagerInstance } from '$lib/types/components';

interface SinglePageModeOptions {
	isSinglePageMode: boolean;
	singlePageMode: SinglePageMode;
	dataLoaded: boolean;
	orderedCategories: Category[];
	loadStoriesForCategory: (categoryId: string) => Promise<void>;
	historyManager: HistoryManagerInstance | undefined;
	currentCategory: string;
	initialCategoryFromUrl?: string | null;
}

/**
 * Manages single page mode effects and category loading
 */
export function useSinglePageMode(options: () => SinglePageModeOptions) {
	const loadedCategoriesForSinglePage = new Set<string>();
	let previousSinglePageMode: boolean | null = null;
	let previousSinglePageModeForLoading: boolean | null = null;

	// Effect to load categories when single page mode is ENABLED (transition from false to true)
	$effect(() => {
		const opts = options();
		if (!opts.dataLoaded) return;

		// Track the transition
		const currentMode = opts.isSinglePageMode;

		// Only load categories when transitioning from disabled to enabled
		// Skip on initial page load (previousSinglePageModeForLoading === null)
		if (
			previousSinglePageModeForLoading !== null &&
			previousSinglePageModeForLoading === false &&
			currentMode === true
		) {
			console.log('[SinglePage] Mode enabled - loading all categories');

			// Find categories that need to be loaded
			const categoriesToLoad: string[] = [];
			for (const category of opts.orderedCategories) {
				if (!loadedCategoriesForSinglePage.has(category.id)) {
					console.log('[SinglePage] Category needs loading:', category.id);
					categoriesToLoad.push(category.id);
					loadedCategoriesForSinglePage.add(category.id);
				}
			}

			if (categoriesToLoad.length > 0) {
				Promise.all(categoriesToLoad.map((catId) => opts.loadStoriesForCategory(catId)));
			}
		}

		previousSinglePageModeForLoading = currentMode;
	});

	// Reset tracking when exiting single page mode
	$effect(() => {
		const opts = options();
		if (!opts.isSinglePageMode) {
			loadedCategoriesForSinglePage.clear();
		}
	});

	// Update URL when single page mode changes
	$effect(() => {
		const opts = options();
		if (!opts.historyManager || !opts.dataLoaded) return;

		// Only update URL if the mode actually changed, not on every reactivity trigger
		if (previousSinglePageMode !== null && previousSinglePageMode === opts.isSinglePageMode) {
			return;
		}

		previousSinglePageMode = opts.isSinglePageMode;

		if (opts.isSinglePageMode) {
			opts.historyManager.updateUrl({ categoryId: '', storyIndex: null });
		} else if (opts.currentCategory) {
			opts.historyManager.updateUrl({ categoryId: opts.currentCategory, storyIndex: null });
		}
	});

	// Track current visible category for scroll-based URL updates
	let currentVisibleCategory = $state<string | null>(null);
	let intersectionObserver: IntersectionObserver | null = null;
	let hasScrolledToInitialCategory = false;
	let isScrollingToInitialCategory = false; // Temporarily disable URL updates during initial scroll

	// Scroll to initial category from URL when entering sequential mode
	$effect(() => {
		if (!browser) return;

		const opts = options();

		// Only scroll in sequential mode when data is loaded
		if (opts.singlePageMode !== 'sequential' || !opts.dataLoaded) {
			hasScrolledToInitialCategory = false;
			isScrollingToInitialCategory = false;
			return;
		}

		// Only scroll once per session
		if (hasScrolledToInitialCategory) return;

		const categoryToScrollTo = opts.initialCategoryFromUrl;

		// Don't scroll if no category specified or it's the first category
		if (!categoryToScrollTo) return;

		const firstCategory = opts.orderedCategories[0]?.id;
		if (categoryToScrollTo === firstCategory) return;

		// Wait for DOM to render category headers
		setTimeout(() => {
			const header = document.querySelector(
				`.category-section-header[data-category-id="${categoryToScrollTo}"]`,
			);

			if (header) {
				hasScrolledToInitialCategory = true;
				isScrollingToInitialCategory = true; // Disable URL updates during scroll
				// Set currentVisibleCategory to prevent immediate URL update
				currentVisibleCategory = categoryToScrollTo;

				header.scrollIntoView({ behavior: 'smooth', block: 'start' });

				// Re-enable URL updates after scroll animation completes
				setTimeout(() => {
					isScrollingToInitialCategory = false;
				}, 800); // Smooth scroll typically takes ~500-700ms
			}
		}, 200);
	});

	// Intersection Observer for scroll-based URL updates in sequential mode
	$effect(() => {
		if (!browser) return;

		const opts = options();

		// Only set up observer in sequential mode when data is loaded
		if (opts.singlePageMode !== 'sequential' || !opts.dataLoaded) {
			// Clean up observer if we're not in sequential mode
			if (intersectionObserver) {
				intersectionObserver.disconnect();
				intersectionObserver = null;
			}
			return;
		}

		// Clean up any existing observer
		if (intersectionObserver) {
			intersectionObserver.disconnect();
		}

		// Create observer with rootMargin to detect when headers cross the top of viewport
		intersectionObserver = new IntersectionObserver(
			(entries) => {
				// Skip URL updates during initial scroll animation
				if (isScrollingToInitialCategory) return;

				// Find all category headers currently in view
				const visibleHeaders: { categoryId: string; top: number }[] = [];

				for (const entry of entries) {
					if (entry.isIntersecting) {
						const categoryId = (entry.target as HTMLElement).dataset.categoryId;
						if (categoryId) {
							visibleHeaders.push({
								categoryId,
								top: entry.boundingClientRect.top,
							});
						}
					}
				}

				// If we have visible headers, the one closest to (but below) the top of the viewport
				// OR the last one that scrolled past the top is our current category
				if (visibleHeaders.length > 0) {
					// Sort by top position
					visibleHeaders.sort((a, b) => a.top - b.top);

					// Find the first header that's at or below the viewport top
					const currentHeader =
						visibleHeaders.find((h) => h.top >= 0) || visibleHeaders[visibleHeaders.length - 1];

					if (currentHeader && currentHeader.categoryId !== currentVisibleCategory) {
						currentVisibleCategory = currentHeader.categoryId;

						// Update URL with the new category
						if (opts.historyManager) {
							opts.historyManager.updateUrl({
								categoryId: currentHeader.categoryId,
								storyIndex: null,
							});
						}
					}
				}
			},
			{
				// Observe a generous area to catch headers as they scroll
				rootMargin: '-50px 0px -70% 0px',
				threshold: [0, 0.5, 1],
			},
		);

		// Observe all category headers after a short delay to let the DOM settle
		setTimeout(() => {
			const headers = document.querySelectorAll('.category-section-header[data-category-id]');
			headers.forEach((header) => {
				intersectionObserver?.observe(header);
			});
		}, 100);

		// Cleanup on effect re-run or unmount
		return () => {
			if (intersectionObserver) {
				intersectionObserver.disconnect();
				intersectionObserver = null;
			}
		};
	});

	return {};
}
