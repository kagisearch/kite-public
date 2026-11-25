<script lang="ts">
import { browser } from '$app/environment';
import { page } from '$app/state';
import { s } from '$lib/client/localization.svelte';
import { resolveFieldDirection } from '$lib/client/rtl-detection';
import { createStoryLocalizer } from '$lib/client/storyLocalization.svelte';
import { readingLevelSettings } from '$lib/data/settings.svelte';
import { useHoverPreloading } from '$lib/hooks/useImagePreloading.svelte';
import { useStoryFlashcards } from '$lib/hooks/useStoryFlashcards.svelte';
import { useStorySimplification } from '$lib/hooks/useStorySimplification.svelte';
import { useStoryTTS } from '$lib/hooks/useStoryTTS.svelte';
import { translationState } from '$lib/stores/translationState.svelte';
import StoryActions from './StoryActions.svelte';
import StoryContentSkeleton from './StoryContentSkeleton.svelte';
import StoryHeader from './StoryHeader.svelte';
import StorySectionManager from './StorySectionManager.svelte';
import StoryTranslationOverlay from './StoryTranslationOverlay.svelte';

// Props
interface Props {
	story: any;
	storyIndex?: number;
	batchId?: string;
	batchDateSlug?: string | null;
	categoryId?: string;
	isRead?: boolean;
	isExpanded?: boolean;
	onToggle?: () => void;
	onReadToggle?: () => void;
	showSourceOverlay?: boolean;
	currentSource?: any;
	sourceArticles?: any[];
	currentMediaInfo?: any;
	isLoadingMediaInfo?: boolean;
	priority?: boolean; // For high-priority stories (first few visible)
	isFiltered?: boolean;
	filterKeywords?: string[];
	shouldAutoScroll?: boolean;
	isSharedView?: boolean;
	isLinkedStory?: boolean; // Story opened from URL/link
	isKeyboardSelected?: boolean; // Story selected via keyboard navigation
}

let {
	story,
	storyIndex,
	batchId,
	batchDateSlug = null,
	categoryId,
	isRead = false,
	isExpanded = false,
	shouldAutoScroll = false,
	onToggle,
	onReadToggle,
	showSourceOverlay = $bindable(false),
	currentSource = $bindable(null),
	sourceArticles = $bindable([]),
	currentMediaInfo = $bindable(null),
	isLoadingMediaInfo = $bindable(false),
	priority = false,
	isFiltered = false,
	filterKeywords = [],
	isSharedView = false,
	isLinkedStory = false,
	isKeyboardSelected = false,
}: Props = $props();

// Story element reference
let storyElement: HTMLElement = undefined!; // Assigned via bind:this

// Blur state - re-check filtering in real-time
// Track if blurred state should be synced with isFiltered prop
const isFilteredProp = $derived(isFiltered);
// svelte-ignore state_referenced_locally - SSR must render the initial filtered prop before effects run.
let isBlurred = $state(isFiltered);
// Track if we're actively revealing (for transition)
let isRevealing = $state(false);

// Sync blur state with filter prop when it changes
$effect(() => {
	// Reset blur state to match current filter state
	isBlurred = isFilteredProp;
	// Reset revealing state when filter changes
	isRevealing = false;
});

// Determine language code from story
const storyLanguageCode = $derived(story.sourceLanguage || 'en');

// Get the default reading level for this category
const categoryDefaultLevel = $derived(
	categoryId ? readingLevelSettings.getForCategory(categoryId) : undefined,
);

// Feature composables - each handles its own state and logic
// svelte-ignore state_referenced_locally - storyLanguageCode is intentionally captured at initialization
const simplification = useStorySimplification(story, storyLanguageCode, {
	defaultLevel: categoryDefaultLevel,
	autoSimplify: !!categoryDefaultLevel && categoryDefaultLevel !== 'normal',
});
// svelte-ignore state_referenced_locally - storyLanguageCode is intentionally captured at initialization
const flashcards = useStoryFlashcards(story, storyLanguageCode);
const tts = useStoryTTS(() => simplification.current);

// On-demand translation: detect if this story needs translation
const needsTranslation = $derived(story.translationAvailable === false);
const storySourceLang = $derived(story.sourceLanguage || 'en');
const translatedFields = $derived(translationState.getFields(story.id));
const isStoryTranslating = $derived(translationState.isTranslating(story.id));
// Columns the server merged from a partial translation row: already in the
// target language before the stream runs, so they count as delivered from the
// start. Commonly the title alone, which is why a Hebrew story listed under an
// English UI showed a right-to-left title until the rest arrived (KNEWS-455).
const preTranslatedFields = $derived(new Set(story.preTranslatedFields ?? []));
const hasTargetText = $derived(
	(field: string) => field in translatedFields || preTranslatedFields.has(field),
);

// Merge translated fields into the story for display
// Merge translated fields onto whichever base (simplified or original) is active.
// Previously a simplified story dropped translations entirely — user with an
// on-demand target language + simplification would see the simplified text in
// the *source* language. Apply translations on top of the simplified object too.
const displayStory = $derived.by(() => {
	const base = simplification.current === story ? story : simplification.current;
	if (!needsTranslation || Object.keys(translatedFields).length === 0) return base;
	return { ...base, ...translatedFields };
});

// True for fields that the SSE stream hasn't delivered yet while a translation
// is in progress — used to shimmer the original-language text in place.
const isFieldPending = $derived((field: string) => {
	if (!needsTranslation || !isStoryTranslating) return false;
	return !hasTargetText(field);
});

// Create story-specific localization function
// Pass the story's actual source language when available
const ss = $derived(createStoryLocalizer(isExpanded, story.sourceLanguage));

// Direction of the story's own text, which is independent of the interface
// language: <html dir> follows the UI (and must, since it drives nav and
// Tailwind's ltr:/rtl: variants), so Hebrew or Arabic content read with an
// English interface inherited ltr (KNEWS-453).
//
// Resolved from the content language rather than dir="auto", which infers
// direction from the first strong character and so flips a Hebrew paragraph
// to ltr the moment it opens with a Latin word — a wire-service name like
// "AP", or "F-35".
//
// Per field, because on-demand translation streams them independently: each
// one is in the target language once it arrives and the source language until
// then. Sections resolve their own inside StorySectionManager.
// Accepts a group because some sections render several columns that arrive
// separately; the group counts as translated only once all of them have.
const fieldDirection = $derived((field: string | string[]) => {
	const fields = Array.isArray(field) ? field : [field];
	// Only columns the story actually has can ever arrive: the translator skips
	// null/empty ones entirely, so requiring them would leave the group
	// permanently untranslated. Roughly a third of business-angle sections have
	// text but no points.
	const expected = fields.filter((name) => {
		const value = story[name];
		return Array.isArray(value)
			? value.length > 0
			: value !== null && value !== undefined && value !== '';
	});
	return resolveFieldDirection({
		sourceLanguage: story.sourceLanguage,
		selectedLanguage: story.selectedLanguage,
		needsTranslation,
		translated: expected.length > 0 && expected.every(hasTargetText),
	});
});

// The card shell and anything without a field of its own follow the title.
const contentDir = $derived(fieldDirection('title'));

// Hover-only preloading: when the user hovers (or focuses) the card, eagerly
// fetch its images + source favicons. We deliberately don't preload off-screen
// stories — that flooded the network on category switches with images the
// user might never see, blocking the new category's data.
// svelte-ignore state_referenced_locally - story prop is stable per component instance
const hoverPreloader = useHoverPreloading(story, { priority });

// Track if images are preloaded
const imagesPreloaded = $derived(hoverPreloader.isPreloaded);

// Trigger auto-simplification when story expands
$effect(() => {
	if (isExpanded && !isSharedView) {
		simplification.triggerAutoSimplify();
	}
});

// Trigger on-demand translation when story expands and needs it.
// Gated on the feature flag: the SSE endpoint 403s flag-off sessions anyway,
// but opening the stream regardless would flash the translating overlay on
// every expand until the rejection lands.
$effect(() => {
	if (isExpanded && needsTranslation && browser && page.data.onDemandTranslations) {
		const selectedLang = story.selectedLanguage;
		if (selectedLang && selectedLang !== storySourceLang) {
			translationState.startTranslation(story.id, selectedLang);
		}
	}
});

// Handle story click
function handleStoryClick() {
	// In shared view mode, don't allow toggling/closing
	if (isSharedView) return;

	// If blurred, reveal
	if (isBlurred) {
		isRevealing = true;
		isBlurred = false;
		// If story is not yet expanded, expand it after a small delay
		if (!isExpanded) {
			setTimeout(() => {
				if (onToggle) onToggle();
			}, 100);
		}
		// Reset revealing state after animation completes
		setTimeout(() => {
			isRevealing = false;
		}, 300);
		return;
	}

	// If we're closing the story (isExpanded is true), clean up all features
	if (isExpanded) {
		tts.stop();
		simplification.reset();
		flashcards.reset();
	}

	if (onToggle) onToggle();
}

// Handle read toggle click
function handleReadClick(e: Event) {
	e.stopPropagation();
	if (onReadToggle) onReadToggle();
}

// Scroll to story when expanded
$effect(() => {
	if (isExpanded && browser && storyElement && shouldAutoScroll) {
		// Small delay to ensure the content is rendered
		setTimeout(() => {
			// Calculate dynamic header height and offsets
			const headerEl = document.querySelector('header') || document.querySelector('nav');
			const headerHeight = headerEl ? headerEl.offsetHeight : 60;

			// Mobile vs desktop offsets - smaller offset for more precise positioning
			const isMobile = window.innerWidth <= 768;
			const extraOffset = isMobile ? 8 : 12;

			// Find the category element within this story for precise positioning
			const categoryElement = storyElement.querySelector('.category-label');

			let rect: DOMRect;
			let elementTop: number;

			if (categoryElement) {
				// Use the category element directly for most precise positioning
				rect = categoryElement.getBoundingClientRect();
				elementTop = window.pageYOffset + rect.top - 28;
			} else {
				// No category label to anchor to (e.g. single-page mode) — skip auto-scroll
				return;
			}

			// Calculate the ideal scroll position to show the category nicely below the header
			const idealScrollPosition = elementTop - headerHeight - extraOffset;

			// Check if the category is properly positioned below the header
			const requiredMargin = headerHeight + extraOffset;
			const isProperlyVisible = rect.top >= requiredMargin && rect.top <= requiredMargin + 20;

			// Only scroll if not properly positioned
			if (!isProperlyVisible) {
				const finalScrollPosition = Math.max(0, idealScrollPosition);

				window.scrollTo({
					top: finalScrollPosition,
					behavior: 'smooth',
				});
			}
		}, 150);
	}
});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<article
	bind:this={storyElement}
	id="story-{story.cluster_number}"
	data-story-id={story.cluster_number?.toString() || story.title}
	data-story-index={storyIndex}
	aria-label="News story: {story.title}"
	class="relative py-2 transition-all duration-200 {isKeyboardSelected
		? 'ring-2 ring-purple-600 bg-purple-50 dark:bg-purple-900/10 -mx-2 px-2 rounded-lg'
		: ''} {isBlurred ? 'cursor-pointer' : ''} {!isExpanded ? 'border-b border-primary-100' : ''}"
	onmouseenter={hoverPreloader.handleMouseEnter}
	onmouseleave={hoverPreloader.handleMouseLeave}
	onfocus={hoverPreloader.handleMouseEnter}
	onclick={isBlurred ? handleStoryClick : undefined}
	onkeydown={isBlurred ? (e) => e.key === 'Enter' && handleStoryClick() : undefined}
	role={isBlurred ? 'button' : undefined}
	tabindex={isBlurred ? 0 : undefined}
>
	<!-- Blurrable Content -->
	<div
		class:transition-all={isRevealing}
		class:duration-200={isRevealing}
		class:blur-lg={isBlurred}
		class:pointer-events-none={isBlurred}
	>
		<!-- Story Header -->
		<StoryHeader
			story={displayStory}
			{contentDir}
			categoryDir={fieldDirection('category')}
			{isRead}
			{isSharedView}
			{isExpanded}
			titleTranslating={isFieldPending('title')}
			onTitleClick={handleStoryClick}
			onReadClick={handleReadClick}
			onFlashcardsClick={flashcards.toggle}
			onExportClick={flashcards.exportFlashcards}
			onDownloadClick={flashcards.download}
			onTtsClick={tts.play}
			onTtsDownloadClick={tts.download}
			ttsStatus={tts.status}
			onSimplifyLevelSelect={simplification.selectLevel}
			selectedLevel={simplification.selectedLevel}
			isSimplifying={simplification.isLoading}
			flashcardMode={flashcards.enabled}
			isExporting={flashcards.isExporting}
			exportedCSV={flashcards.exportedCSV}
			selectedWordsCount={flashcards.selectedCount}
		/>

		<!-- Expanded Content -->
		{#if isExpanded}
			<div
				class="dark:bg-dark-bg flex flex-col bg-white py-4 [&>section:first-of-type]:mt-0"
				role="region"
				aria-label="Story content"
				dir={contentDir}
			>
				<!-- Show skeleton while auto-simplifying -->
				{#if simplification.isLoading && simplification.isAutoSimplified}
					<StoryContentSkeleton readingLevel={simplification.defaultLevel} />
				{:else}
					<!-- Translation indicator -->
					{#if isStoryTranslating}
						<StoryTranslationOverlay
							{translatedFields}
							targetLanguage={story.selectedLanguage}
							sourceLanguage={story.sourceLanguage}
						/>
					{/if}

					<!-- Dynamic Sections based on user settings -->
					<StorySectionManager
						story={displayStory}
						{imagesPreloaded}
						{isFieldPending}
						{fieldDirection}
						bind:showSourceOverlay
						bind:currentSource
						bind:sourceArticles
						bind:currentMediaInfo
						bind:isLoadingMediaInfo
						storyLocalizer={ss}
						flashcardMode={flashcards.enabled && !flashcards.isExporting}
						selectedWords={flashcards.selectedWords}
						selectedPhrases={flashcards.selectedPhrases}
						shouldJiggle={flashcards.shouldJiggle}
						onWordClick={flashcards.selectWord}
					/>
				{/if}
			</div>

			<!-- Share/Report/Close belong to the page, not the story: they're
			     interface controls in the interface language. Left inside the
			     directional wrapper they swapped sides per story, so the buttons
			     sat left on an English story and right on the Hebrew one below
			     it (KNEWS-453). -->
			<div class="dark:bg-dark-bg flex flex-col bg-white pb-4">
				<StoryActions
					story={displayStory}
					{batchId}
					{batchDateSlug}
					{categoryId}
					{storyIndex}
					onClose={handleStoryClick}
					{isSharedView}
					storyLocalizer={ss}
				/>
			</div>
		{/if}
	</div>

	<!-- Blur Warning Overlay -->
	{#if isBlurred && filterKeywords && filterKeywords.length > 0}
		<div
			class="absolute inset-0 z-dropdown flex items-center gap-3 px-4"
			role="alert"
			aria-live="polite"
		>
			<span class="text-sm font-medium text-primary-700">
				{isLinkedStory
					? s('contentFilter.linkedStoryFilteredBecause') ||
						'The story you wanted to view is blocked by your content filter:'
					: s('contentFilter.filteredBecause') || 'Hidden due to filter:'}
			</span>
			<div class="flex items-center gap-2">
				{#each filterKeywords.slice(0, 3) as keyword}
					<span
						class="text-xs font-semibold text-primary-800 bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded"
					>
						{keyword}
					</span>
				{/each}
				{#if filterKeywords.length > 3}
					<span class="text-xs text-primary-600">
						+{filterKeywords.length - 3}
					</span>
				{/if}
			</div>
			<span class="text-xs text-primary-600 italic">
				{isLinkedStory
					? s('contentFilter.linkedStoryClickToReveal') || 'Click to show anyway'
					: s('contentFilter.clickToReveal') || 'Click to show'}
			</span>
		</div>
	{/if}
</article>
