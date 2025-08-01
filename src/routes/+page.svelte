<script lang="ts">
import { onMount } from 'svelte';
import { browser } from '$app/environment';
import { page } from '$app/state';
import { dataLanguage } from '$lib/stores/dataLanguage.svelte.js';
import { settings } from '$lib/stores/settings.svelte.js';
import { categories as categoriesStore } from '$lib/stores/categories.svelte.js';
import { storyCount } from '$lib/stores/storyCount.svelte.js';
import type { SupportedLanguage } from '$lib/stores/language.svelte';
import { dataService, dataReloadService } from '$lib/services/dataService';
import { clearImageCache, getImageCacheStats, extractStoryImages } from '$lib/utils/imagePreloader';
import { imagePreloadingService } from '$lib/services/imagePreloadingService';
import { categorySwipeHandler } from '$lib/utils/categorySwipeHandler';
import { formatTimeAgo } from '$lib/utils/formatTimeAgo';
import { UrlNavigationService, type NavigationParams } from '$lib/services/urlNavigationService';
import { navigationHandlerService } from '$lib/services/navigationHandlerService';
import type { Category, Story, OnThisDayEvent } from '$lib/types';

import DataLoader from '$lib/components/DataLoader.svelte';
import IntroScreen from '$lib/components/IntroScreen.svelte';
import Header from '$lib/components/Header.svelte';
import Settings from '$lib/components/Settings.svelte';
import CategoryNavigation from '$lib/components/CategoryNavigation.svelte';
import TemporaryCategoryTooltip from '$lib/components/TemporaryCategoryTooltip.svelte';
import Footer from '$lib/components/Footer.svelte';
import StoryList from '$lib/components/StoryList.svelte';
import OnThisDay from '$lib/components/OnThisDay.svelte';
import SourceOverlay from '$lib/components/SourceOverlay.svelte';
import WikipediaPopup from '$lib/components/WikipediaPopup.svelte';
import TimeTravel from '$lib/components/TimeTravel.svelte';
import HistoryManager from '$lib/components/HistoryManager.svelte';
import { s } from '$lib/client/localization.svelte';


// App state
let dataLoaded = $state(false);
let offlineMode = $state(false);
let lastLoadedCategory = $state(''); // Track last loaded category to prevent duplicates
let temporaryCategory = $state<string | null>(null);
let showTemporaryCategoryTooltip = $state(false);
let temporaryCategoryElement = $state<HTMLElement | null>(null);
let desktopCategoryNavigation = $state<CategoryNavigation>();
let storyCountOverride = $state<number | null>(null);

// Reactive category header position
const categoryHeaderPosition = $derived(settings.categoryHeaderPosition);

const storyExpandMode = $derived(settings.storyExpandMode);

// Data state
let categories = $state<Category[]>([]);
let currentCategory = $state('World');
let stories = $state<Story[]>([]);
let onThisDayEvents = $state<OnThisDayEvent[]>([]);
let readStories = $state<Record<string, boolean>>({});
let totalReadCount = $state(0);
let totalStoriesRead = $state(0);
let lastUpdated = $state('');
let allCategoryStories = $state<Record<string, Story[]>>({});
let categoryMap = $state<Record<string, string>>({});  // Map category ID to UUID
let currentBatchId = $state<string>('');

// Component references
let storyList = $state<StoryList | undefined>();

// State for source overlay
let showSourceOverlay = $state(false);
let currentSource = $state<any>(null);
let sourceArticles = $state<any[]>([]);
let currentMediaInfo = $state<any>(null);
let isLoadingMediaInfo = $state(false);

// State for chaos index
let chaosIndex = $state({
	score: 0,
	summary: '',
	lastUpdated: ''
});

// State for view mode (currently unused but reserved for future map view)
// let viewMode = $state<'list' | 'map'>('list');

// State for Wikipedia popup
let wikipediaPopup = $state({
	visible: false,
	title: '',
	content: '',
	imageUrl: ''
});

// State for story URL management - Initialize with empty reactive objects
let expandedStories = $state<Record<string, boolean>>({});
let isLatestBatch = $state(true);
let historyManager = $state<HistoryManager>();

// Compute current story index from expanded stories
const currentStoryIndex = $derived.by(() => {
	const expandedStoryId = Object.keys(expandedStories).find(id => expandedStories[id]);
	if (!expandedStoryId) return null;
	
	const story = stories.find(s => 
		(s.cluster_number?.toString() === expandedStoryId) || 
		(s.title === expandedStoryId)
	);
	
	return story ? stories.indexOf(story) : null;
});

// Create ordered categories based on store order
const orderedCategories = $derived.by(() => {
	if (categories.length === 0 || categoriesStore.enabled.length === 0) {
		return categories;
	}

	// Filter only enabled categories and order them according to store order
	// Now that the store always uses IDs, we only need to check cat.id
	const enabledCategories = categories.filter(cat => 
		categoriesStore.enabled.includes(cat.id) || 
		(temporaryCategory && cat.id === temporaryCategory) // Include temporary category
	);

	// Sort by store order
	return enabledCategories.sort((a, b) => {
		// Temporary category should appear where it would naturally fit
		if (a.id === temporaryCategory) return -1;
		if (b.id === temporaryCategory) return 1;
		
		const aIndex = categoriesStore.enabled.findIndex(id => id === a.id);
		const bIndex = categoriesStore.enabled.findIndex(id => id === b.id);
		return aIndex - bIndex;
	});
});

// Data loading functions
function handleDataLoaded(data: {
	categories: Category[];
	stories: Story[];
	totalReadCount: number;
	lastUpdated: string;
	currentCategory: string;
	allCategoryStories: Record<string, Story[]>;
	categoryMap: Record<string, string>;
	batchId: string;
	chaosIndex?: number;
	chaosDescription?: string;
	chaosLastUpdated?: string;
	isLatestBatch: boolean;
	temporaryCategory?: string | null;
}) {
	// Reset app state for fresh data
	expandedStories = {};
	lastLoadedCategory = '';
	
	// Close any open overlays
	if (showSourceOverlay) {
		handleCloseSource();
	}
	if (wikipediaPopup.visible) {
		closeWikipediaPopup();
	}
	
	// Load new data
	categories = data.categories;
	stories = data.stories;
	totalReadCount = data.totalReadCount;
	lastUpdated = data.lastUpdated;
	currentCategory = data.currentCategory;
	allCategoryStories = data.allCategoryStories;
	categoryMap = data.categoryMap;
	currentBatchId = data.batchId;
	lastLoadedCategory = data.currentCategory; // Set the guard for initial load
	
	// Use the isLatestBatch value from DataLoader
	isLatestBatch = data.isLatestBatch;
	
	// Set chaos index from initial load
	if (data.chaosIndex !== undefined && data.chaosDescription && data.chaosLastUpdated) {
		chaosIndex = {
			score: data.chaosIndex,
			summary: data.chaosDescription,
			lastUpdated: data.chaosLastUpdated
		};
	}
	
	// Handle temporary category
	if (data.temporaryCategory) {
		temporaryCategory = data.temporaryCategory;
		showTemporaryCategoryTooltip = true;
	}
	
	dataLoaded = true;
	
	console.log(`🚀 Loaded ${Object.keys(allCategoryStories).length} categories with ${Object.values(allCategoryStories).flat().length} total stories`);
	
	// After initial data load, check if we need to handle story expansion from URL
	if (browser) {
		const urlParams = parseInitialUrl();
		if (urlParams.storyIndex !== undefined && urlParams.storyIndex !== null && stories[urlParams.storyIndex]) {
			// Expand the story from URL
			const story = stories[urlParams.storyIndex];
			const storyId = story.cluster_number?.toString() || story.title;
			expandedStories[storyId] = true;
			
			// Check if we need to override story count limit
			if (urlParams.storyIndex >= storyCount.current) {
				storyCountOverride = urlParams.storyIndex + 1;
			}
		}
	}
}

function handleDataError(error: string) {
	console.error('Data loading error:', error);
	// Could show error state here if needed
	dataLoaded = true; // Still show the app with fallback data
}

async function loadStoriesForCategory(categoryId: string) {
	// Handle OnThisDay separately
	if (categoryId === 'onthisday') {
		await loadOnThisDayEvents();
		return;
	}
	
	// Check if we already have preloaded stories for this category
	if (allCategoryStories[categoryId]) {
		console.log(`⚡ Using preloaded stories for category: ${categoryId}`);
		stories = allCategoryStories[categoryId];
		lastLoadedCategory = categoryId;
		// Images should already be preloaded from DataLoader
		return;
	}
	
	// Fallback: Load from API if not preloaded (shouldn't happen for enabled categories)
	if (lastLoadedCategory === categoryId) {
		return;
	}
	
	// Check if we have a UUID mapping for this category
	const categoryUuid = categoryMap[categoryId];
	if (!categoryUuid) {
		console.warn(`Category UUID not found for ${categoryId}, cannot load stories`);
		stories = [];
		return;
	}
	
	try {
		console.log(`📡 Loading stories from API for category: ${categoryId} (not preloaded)`);
		lastLoadedCategory = categoryId;
		const result = await dataService.loadStories(currentBatchId, categoryUuid, 12, dataLanguage.current);
		stories = result.stories;
		totalReadCount = result.readCount;
		lastUpdated = formatTimeAgo(result.timestamp, s);
		
		// Cache the loaded stories for this category
		allCategoryStories[categoryId] = stories;
		console.log(`💾 Cached stories for category: ${categoryId}`);
	} catch (error) {
		console.error('Error loading stories for category:', categoryId, error);
		// DON'T reset the guard - give up and stop retrying
		// Keep existing stories on error
	}
}

async function loadOnThisDayEvents() {
	try {
		lastLoadedCategory = 'onthisday';
		const events = await dataService.loadOnThisDayEvents(dataLanguage.current);
		onThisDayEvents = events;
		// OnThisDay doesn't have read count or timestamp in the same format
		// We could add these later if needed
	} catch (error) {
		console.error('Error loading OnThisDay events:', error);
		// Keep existing events on error
	}
}


onMount(() => {
	// Check for data language in URL first
	const urlParams = parseInitialUrl();
	if (urlParams.dataLang && urlParams.dataLang !== dataLanguage.current) {
		// Validate it's a supported language
		if (UrlNavigationService.isValidDataLanguage(urlParams.dataLang)) {
			console.log('Setting data language from URL on mount:', urlParams.dataLang);
			dataLanguage.set(urlParams.dataLang as SupportedLanguage);
		}
	}
	
	// Load saved read stories from localStorage
	try {
		const saved = localStorage.getItem('readStories');
		if (saved) {
			const savedReadStories = JSON.parse(saved);
			readStories = savedReadStories;
			totalStoriesRead = Object.values(savedReadStories).filter(Boolean).length;
		}
	} catch (error) {
		console.error('Error loading saved stories:', error);
	}

	// Handle URL hash navigation
	function handleHashChange() {
		const hash = window.location.hash.slice(1); // Remove the #
		if (hash.startsWith('settings')) {
			// Extract tab name if provided (e.g., #settings/filter)
			const parts = hash.split('/');
			const tab = parts[1] || undefined;
			settings.open(tab);
			// Clear the hash to avoid issues with back button
			window.history.replaceState(null, '', window.location.pathname + window.location.search);
		}
	}

	// Check initial hash
	handleHashChange();

	// Listen for hash changes
	window.addEventListener('hashchange', handleHashChange);

	// Cleanup
	return () => {
		window.removeEventListener('hashchange', handleHashChange);
	};
});

// Helper functions
const getLastUpdated = (): string => lastUpdated || s('loading.default') || 'Loading...';
const parseInitialUrl = (): NavigationParams => browser ? UrlNavigationService.parseUrl(page.url) : {};
const handleIntroClose = () => settings.setShowIntro(false);

// Handle category change
function handleCategoryChange(category: string, updateUrl: boolean = true) {
	if (category === currentCategory) {
		return;
	}

	currentCategory = category;
	
	// Reset view mode when changing categories (when map view is implemented)
	// if (category.toLowerCase() !== 'world') {
	// 	viewMode = 'list';
	// }

	// Clear expanded stories when switching categories
	expandedStories = {};
	
	// Clear temporary category if user manually navigates
	if (updateUrl && temporaryCategory) {
		categoriesStore.removeTemporary();
		temporaryCategory = null;
		showTemporaryCategoryTooltip = false;
	}
	
	// Reset story count override when changing categories
	if (updateUrl && storyCountOverride !== null) {
		storyCountOverride = null;
	}

	// Load stories for the new category (will be instant for preloaded categories)
	loadStoriesForCategory(category);
	
	// Update URL to reflect new category (unless we're handling a URL change)
	if (historyManager && updateUrl && !navigationHandlerService.isNavigating()) {
		historyManager.updateUrl({ categoryId: category, storyIndex: null });
	}
	
	if (storyExpandMode === 'always') {
		storyList?.toggleExpandAll();
	}

	// Chaos index is already loaded with the batch data
}

// Wikipedia popup handlers
const handleWikipediaClick = (title: string, content: string, imageUrl?: string) => {
	wikipediaPopup = { visible: true, title, content, imageUrl: imageUrl || '' };
};

const closeWikipediaPopup = () => {
	wikipediaPopup = { visible: false, title: '', content: '', imageUrl: '' };
};

function handleStoryToggle(storyId: string, updateUrl: boolean = true) {
	// Check current state
	const currentlyExpanded = expandedStories[storyId];
	
	// Create a new object with existing expanded stories to ensure reactivity
	const newExpandedStories: Record<string, boolean> = { ...expandedStories };
	
	// Toggle the clicked story
	if (!currentlyExpanded) {
		newExpandedStories[storyId] = true;
		
		// Find the story and mark it as read
		const story = stories.find(s => 
			(s.cluster_number?.toString() === storyId) || 
			(s.title === storyId)
		);
		
		if (story) {
			// Mark as read - also create new object for reactivity
			readStories = { ...readStories, [story.title]: true };
			
			// Update URL with story index
			if (updateUrl && historyManager) {
				const storyIndex = stories.indexOf(story);
				if (storyIndex >= 0) {
					historyManager.updateUrl({ storyIndex });
				}
			}
		}
	} else {
		// Story is being collapsed
		delete newExpandedStories[storyId];
		
		// Remove from URL if this was the last expanded story
		if (updateUrl && historyManager && Object.keys(newExpandedStories).length === 0) {
			historyManager.updateUrl({ storyIndex: null });
		}
	}
	
	// Assign the new object to trigger reactivity
	expandedStories = newExpandedStories;
}

// Reactive effect to save read stories and update count
$effect(() => {
	// Update total stories read count
	const readCount = Object.values(readStories).filter(Boolean).length;
	totalStoriesRead = readCount;
	
	// Save to localStorage
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('readStories', JSON.stringify(readStories));
	}
});

// Handle source overlay close
const handleCloseSource = () => {
	showSourceOverlay = false;
	currentSource = null;
	sourceArticles = [];
	currentMediaInfo = null;
	isLoadingMediaInfo = false;
};

// Handle navigation from URL changes
const handleUrlNavigation = async (params: NavigationParams) => {
	const updates = await navigationHandlerService.handleUrlNavigation(params, {
		currentBatchId,
		currentCategory,
		categories,
		stories,
		allCategoryStories,
		expandedStories,
		isLatestBatch,
		storyCountOverride
	}, {
		setDataLanguage: (lang: SupportedLanguage) => dataLanguage.set(lang),
		getCurrentDataLanguage: () => dataLanguage.current,
		handleCategoryChange
	});
	
	// Apply state updates
	if (updates.isLatestBatch !== undefined) isLatestBatch = updates.isLatestBatch;
	if (updates.expandedStories !== undefined) {
		// Directly set the expanded stories from navigation
		expandedStories = updates.expandedStories;
	}
	if (updates.storyCountOverride !== undefined) {
		storyCountOverride = updates.storyCountOverride;
	}
};

// Single consolidated effect for category/language management
$effect(() => {
	if (!dataLoaded) return;
	
	// Initialize category if needed
	// Don't reset if we have a temporary category that matches current
	if (orderedCategories.length > 0 && 
		!orderedCategories.find(cat => cat.id === currentCategory) &&
		!(temporaryCategory && currentCategory === temporaryCategory)) {
		currentCategory = orderedCategories[0].id;
		return; // Exit early, let the next effect run handle loading
	}
	
	// Update swipe handler
	if (orderedCategories.length > 0) {
		categorySwipeHandler.updateState(orderedCategories, currentCategory, handleCategoryChange);
	}
	
	// Load stories if category is valid 
	if (currentCategory && orderedCategories.find(cat => cat.id === currentCategory)) {
		loadStoriesForCategory(currentCategory);
		// Removed chaos index loading here - it's already loaded from DataLoader
	}
});

// Language changes are now handled by DataLoader through the reload service
// Chaos index will be reloaded with all other data when language changes

// Update temporary category element reference when needed
$effect(() => {
	if (temporaryCategory && desktopCategoryNavigation && showTemporaryCategoryTooltip) {
		temporaryCategoryElement = desktopCategoryNavigation.getCategoryElement(temporaryCategory);
	} else {
		temporaryCategoryElement = null;
	}
});


// Debug helper for testing (only in development)
if (browser && typeof window !== 'undefined') {
	(window as any).kiteDebug = {
		getCacheStats: getImageCacheStats,
		clearCache: clearImageCache,
		preloadCurrentCategory: () => imagePreloadingService.preloadCategory(stories),
		getCurrentStories: () => stories,
		getCurrentCategory: () => currentCategory,
		getAllCategoryStories: () => allCategoryStories,
		getPreloadedCategories: () => Object.keys(allCategoryStories),
		getImageUrls: () => {
			const allUrls: string[] = [];
			stories.forEach(story => {
				allUrls.push(...extractStoryImages(story));
			});
			return [...new Set(allUrls)];
		},
		getAllImageUrls: () => {
			const allUrls: string[] = [];
			Object.values(allCategoryStories).flat().forEach(story => {
				allUrls.push(...extractStoryImages(story));
			});
			return [...new Set(allUrls)];
		},
		showPreloadingSettings: () => {
			console.log('🔧 Enabling preloading settings tab');
			if ((window as any).kiteSettingsDebug && (window as any).kiteSettingsDebug.enablePreloadingTab) {
				(window as any).kiteSettingsDebug.enablePreloadingTab();
				console.log('✅ Preloading settings tab enabled permanently. Open settings to see it.');
				return '✅ Preloading tab enabled permanently. Open settings to see it.';
			} else {
				console.log('❌ Settings component not available. Please refresh and try again.');
				return '❌ Settings component not available. Please refresh and try again.';
			}
		},
		hidePreloadingSettings: () => {
			console.log('🔧 Disabling preloading settings tab');
			if ((window as any).kiteSettingsDebug && (window as any).kiteSettingsDebug.disablePreloadingTab) {
				(window as any).kiteSettingsDebug.disablePreloadingTab();
				console.log('✅ Preloading settings tab disabled.');
				return '✅ Preloading tab disabled.';
			} else {
				console.log('❌ Settings component not available. Please refresh and try again.');
				return '❌ Settings component not available. Please refresh and try again.';
			}
		}
	};
} 
</script>

<svelte:head>
	<title>{s('app.title') || 'Kite'} - {s('app.motto') || 'News. Elevated.'}</title>
</svelte:head>

{#if !dataLoaded}
	{@const urlParams = parseInitialUrl()}
	<DataLoader 
		onDataLoaded={handleDataLoaded}
		onError={handleDataError}
		initialBatchId={urlParams.batchId}
		initialCategoryId={urlParams.categoryId}
	/>
{:else if settings.showIntro}
	<IntroScreen visible={settings.showIntro} onClose={handleIntroClose} />
{:else}
	<!-- History Manager for URL state -->
	<HistoryManager
		bind:this={historyManager}
		batchId={currentBatchId}
		categoryId={currentCategory}
		storyIndex={currentStoryIndex}
		onNavigate={handleUrlNavigation}
	/>
	<!-- Category Navigation - Mobile only (fixed positioning) -->
	<div class="md:hidden">
		<CategoryNavigation 
			categories={orderedCategories}
			{currentCategory} 
			onCategoryChange={handleCategoryChange}
			onCategoryDoubleClick={() => storyList?.toggleExpandAll()}
			mobilePosition={categoryHeaderPosition}
			temporaryCategory={temporaryCategory}
			showTemporaryTooltip={false}
		/>
	</div>

	<!-- Main Content -->
	<main 
		class="pb-[56px] md:pb-0 {categoryHeaderPosition === 'top' ? 'pt-12 md:pt-0' : ''}"
		ontouchstart={categorySwipeHandler.handleTouchStart}
		ontouchmove={categorySwipeHandler.handleTouchMove}
		ontouchend={categorySwipeHandler.handleTouchEnd}
	>
		<div class="container mx-auto max-w-[732px] px-4 py-8">
			<Header 
				{offlineMode} 
				{totalReadCount} 
				{totalStoriesRead} 
				{getLastUpdated}
				{chaosIndex}
			/>
			
			<!-- Category Navigation - Desktop (normal document flow) -->
			<div class="hidden md:block">
				<CategoryNavigation 
					bind:this={desktopCategoryNavigation}
					categories={orderedCategories}
					{currentCategory} 
					onCategoryChange={handleCategoryChange}
					onCategoryDoubleClick={() => storyList?.toggleExpandAll()}
					mobilePosition="bottom"
					temporaryCategory={temporaryCategory}
					showTemporaryTooltip={showTemporaryCategoryTooltip}
				/>
			</div>
			
			<div>
			<!-- News Content -->
				{#if currentCategory === 'onthisday'}
					<OnThisDay 
						stories={onThisDayEvents}
						onWikipediaClick={handleWikipediaClick}
					/>
				{:else}
					<StoryList
						bind:this={storyList}
						{stories}
						{currentCategory}
						batchId={currentBatchId}
						bind:expandedStories
						onStoryToggle={handleStoryToggle}
						bind:readStories
						bind:showSourceOverlay
						bind:currentSource
						bind:sourceArticles
						bind:currentMediaInfo
						bind:isLoadingMediaInfo
						{storyCountOverride}
					/>
				{/if}
			</div>
			

			
			<!-- Footer -->
			<Footer 
				{currentCategory}
				onShowAbout={() => settings.setShowIntro(true)}
			/>
		</div>
	</main>
	{/if}

<!-- Settings Modal -->
<Settings 
	visible={settings.isOpen} 
	{categories}
	onClose={() => settings.close()}
	onShowAbout={() => { settings.close(); settings.setShowIntro(true); }}
/>

<!-- Time Travel Modal -->
<TimeTravel />

<!-- Source Overlay -->
<SourceOverlay 
	isOpen={showSourceOverlay}
	{currentSource}
	{sourceArticles}
	{currentMediaInfo}
	{isLoadingMediaInfo}
	onClose={handleCloseSource}
/>

<!-- Wikipedia Popup -->
<WikipediaPopup 
	visible={wikipediaPopup.visible}
	title={wikipediaPopup.title}
	content={wikipediaPopup.content}
	imageUrl={wikipediaPopup.imageUrl}
	onClose={closeWikipediaPopup}
/>

<!-- Temporary Category Tooltip -->
<TemporaryCategoryTooltip 
	show={showTemporaryCategoryTooltip}
	referenceElement={temporaryCategoryElement}
/>