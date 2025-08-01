<script lang="ts">
import { browser } from '$app/environment';
import { page } from '$app/state';
import { goto, replaceState } from '$app/navigation';
import { dataLanguage } from '$lib/stores/dataLanguage.svelte.js';
import { UrlNavigationService, type NavigationParams } from '$lib/services/urlNavigationService';

interface Props {
	batchId: string;
	categoryId: string;
	storyIndex?: number | null;
	onNavigate?: (params: NavigationParams) => void;
}

let { 
	batchId = $bindable(),
	categoryId = $bindable(),
	storyIndex = $bindable(null),
	onNavigate
}: Props = $props();

// Track if we're restoring from history to prevent loops
let isRestoringFromHistory = $state(false);
let previousUrl = $state('');

// Build URL based on current state
function buildUrl(params?: Partial<NavigationParams>): string {
	const navigationParams: NavigationParams = {
		batchId: params?.batchId !== undefined ? params.batchId : batchId,
		categoryId: params?.categoryId !== undefined ? params.categoryId : categoryId,
		storyIndex: params?.storyIndex !== undefined ? params.storyIndex : storyIndex,
	};
	
	return UrlNavigationService.buildUrl(navigationParams, dataLanguage.current);
}

// Update URL without triggering navigation
export function updateUrl(params?: Partial<NavigationParams>) {
	if (!browser || isRestoringFromHistory) return;
	
	const newUrl = buildUrl(params);
	
	// Only update if URL actually changed
	if (newUrl !== previousUrl) {
		previousUrl = newUrl;
		replaceState(newUrl, {});
	}
}

// Navigate to new URL with history entry
export function navigateTo(params: Partial<NavigationParams>) {
	if (!browser || isRestoringFromHistory) return;
	
	const newUrl = buildUrl(params);
	
	// Only navigate if URL actually changed
	if (newUrl !== previousUrl) {
		previousUrl = newUrl;
		goto(newUrl);
	}
}

// Track if initial load has been processed
let initialLoadProcessed = $state(false);

// Handle initial page load and browser navigation
$effect(() => {
	if (!browser) return;
	
	// Parse current URL
	const params = UrlNavigationService.parseUrl(page.url);
	const urlString = UrlNavigationService.getFullUrl(page.url);
	
	// Handle initial page load
	if (!initialLoadProcessed && onNavigate) {
		initialLoadProcessed = true;
		previousUrl = urlString;
		
		// Only navigate if we have actual URL parameters to process
		const hasParams = params.batchId !== undefined || 
		                 params.categoryId !== undefined || 
		                 params.storyIndex !== undefined ||
		                 params.dataLang !== undefined;
		                 
		if (hasParams) {
			isRestoringFromHistory = true;
			onNavigate(params);
			
			// Reset flag after a short delay
			setTimeout(() => {
				isRestoringFromHistory = false;
			}, 100);
		}
		return;
	}
	
	// Check if we need to restore state from URL (browser navigation)
	if (UrlNavigationService.areUrlsDifferent(urlString, previousUrl) && !isRestoringFromHistory) {
		isRestoringFromHistory = true;
		previousUrl = urlString;
		
		// Notify parent component about navigation
		if (onNavigate) {
			onNavigate(params);
		}
		
		// Reset flag after a short delay
		setTimeout(() => {
			isRestoringFromHistory = false;
		}, 100);
	}
});

// Track previous props to detect actual changes
let previousBatchId = $state<string>();
let previousCategoryId = $state<string>();
let previousStoryIndex = $state<number | null>();

// Update URL when props change
$effect(() => {
	if (!browser || isRestoringFromHistory || !initialLoadProcessed) return;
	
	// Only update URL if props actually changed
	const batchChanged = batchId !== previousBatchId;
	const categoryChanged = categoryId !== previousCategoryId;
	const storyChanged = storyIndex !== previousStoryIndex;
	
	if (batchChanged || categoryChanged || storyChanged) {
		previousBatchId = batchId;
		previousCategoryId = categoryId;
		previousStoryIndex = storyIndex;
		
		// Update URL to reflect current state
		updateUrl();
	}
});
</script>