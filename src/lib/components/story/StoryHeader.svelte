<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { settingsLock } from '$lib/data/settings.svelte.js';
import { experimental } from '$lib/stores/experimental.svelte.js';
import { language } from '$lib/stores/language.svelte';
import { sections } from '$lib/stores/sections.svelte.js';
import { type CitationMapping, replaceWithNumberedCitations } from '$lib/utils/citationContext';
import { extractStoryText } from '$lib/utils/storyTextExtractor';
import { containsCJK } from '$lib/utils/textUtils';
import Tooltip from '../Tooltip.svelte';
import StoryCorrections from './StoryCorrections.svelte';
import { IconCards, IconDownload, IconSparkles, IconVolume } from '@tabler/icons-svelte';
import { getContext } from 'svelte';

// Props
interface Props {
	story: any;
	/** Direction of the story's own text; see StoryCard's contentDir. */
	contentDir?: 'ltr' | 'rtl';
	/** Direction of the category label, which translates on its own. */
	categoryDir?: 'ltr' | 'rtl';
	isRead?: boolean;
	isSharedView?: boolean;
	isExpanded?: boolean;
	titleTranslating?: boolean;
	onTitleClick?: () => void;
	onReadClick?: (e: Event) => void;
	onFlashcardsClick?: () => void;
	onExportClick?: () => void;
	onDownloadClick?: () => void;
	onTtsClick?: () => void;
	onTtsDownloadClick?: () => void;
	onSimplifyLevelSelect?: (level: 'very-simple' | 'simple' | 'normal') => void;
	citationMapping?: CitationMapping;
	isSimplifying?: boolean;
	selectedLevel?: 'very-simple' | 'simple' | 'normal' | null;
	flashcardMode?: boolean;
	isExporting?: boolean;
	exportedCSV?: { content: string; filename: string } | null;
	selectedWordsCount?: number;
	ttsStatus?: 'idle' | 'loading' | 'playing';
}

let {
	story,
	contentDir = 'ltr',
	categoryDir = 'ltr',
	isRead = false,
	isSharedView = false,
	isExpanded = false,
	titleTranslating = false,
	onTitleClick,
	onReadClick,
	onFlashcardsClick,
	onExportClick,
	onDownloadClick,
	onTtsClick,
	onTtsDownloadClick,
	onSimplifyLevelSelect,
	citationMapping,
	isSimplifying = false,
	selectedLevel = null,
	flashcardMode = false,
	isExporting = false,
	exportedCSV = null,
	selectedWordsCount = 0,
	ttsStatus = 'idle',
}: Props = $props();

// Toggle state for showing/hiding reading level buttons
let showSimplifySelector = $state(false);

function handleSimplifyToggle() {
	showSimplifySelector = !showSimplifySelector;
}

// Get session from context
const session = getContext<Session | null>('session');

// Check if user is a subscriber
const isSubscriber = $derived(session?.subscription === true);

// Check if user is logged in (for assistant feature)
const isLoggedIn = $derived(session?.loggedIn === true);

// Assistant input state
let showAssistantInput = $state(false);
let assistantQuestion = $state('');

// Maximum safe URL length for browsers
const MAX_URL_LENGTH = 2000;

// Get user's interface language name for assistant prompt
function getUserLanguageName(): string {
	const locale = language.currentLocale || 'en';
	try {
		const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
		return displayNames.of(locale) || 'English';
	} catch {
		return 'English';
	}
}

// Build the assistant query, truncating story text to fit the user's question + context within URL limit
function buildAssistantUrl(userQuestion: string): string {
	const userLanguageName = getUserLanguageName();
	const userLocale = language.currentLocale || 'en';
	const today = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	const suffix = `\n\nThis is a news story from Kagi News, reported on ${today}. Please respond in the same language as the user's question.\n\nUser's question: ${userQuestion}`;
	const prefix = 'News story:\n\n';
	const enabledSections = sections.list
		.filter((sec) => sec.enabled)
		.sort((a, b) => a.order - b.order);
	const fullText = extractStoryText(story, enabledSections);

	const baseUrl = 'https://kagi.com/assistant?q=';
	let text = fullText;
	while (text.length > 0) {
		const query = `${prefix}${text}${suffix}`;
		const url = `${baseUrl}${encodeURIComponent(query)}`;
		if (url.length <= MAX_URL_LENGTH) return url;
		// Truncate to ~80% and snap to last sentence boundary
		const targetLen = Math.floor(text.length * 0.8);
		const truncated = text.slice(0, targetLen);
		const lastSentence = truncated.lastIndexOf('. ');
		text = lastSentence > 0 ? truncated.slice(0, lastSentence + 1) : truncated.trimEnd();
		if (text.length === fullText.length) break;
	}

	return `${baseUrl}${encodeURIComponent(`News topic: ${story.title}${suffix}`)}`;
}

// Submit question to Kagi Assistant
function submitAssistantQuestion() {
	const question = assistantQuestion.trim();
	if (!question) return;
	window.open(buildAssistantUrl(question), '_blank', 'noopener,noreferrer');
	assistantQuestion = '';
	showAssistantInput = false;
}

const TOPIC_COLOR_COUNT = 9;

// Generate topic color class using a smarter selection algorithm
function getTopicColorClass(category: string): string {
	// Create a simple hash from the category string
	let hash = 0;
	for (let i = 0; i < category.length; i++) {
		const char = category.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	// Use the hash to select from our distinct colors
	const colorIndex = Math.abs(hash) % TOPIC_COLOR_COUNT;
	return `topic-color-${colorIndex}`;
}

// Get emoji from story data when experimental settings are enabled
const categoryEmoji = $derived(experimental.showCategoryIcons ? story.emoji : '');
const articleEmoji = $derived(experimental.showArticleIcons ? story.emoji : '');

// Convert title citations to numbered format if mapping is available
const displayTitle = $derived.by(() => {
	if (!citationMapping) return story.title;
	return replaceWithNumberedCitations(story.title, citationMapping);
});

// Check if story contains CJK characters (flashcards don't work for CJK)
const isCJKStory = $derived(containsCJK(story.title));
</script>

<!-- Story Header -->
{#if !isSharedView}
	<header class="mb-1 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div
				class="category-label inline-flex items-center rounded py-1 text-xs text-primary-700 uppercase"
				style="font-size: var(--text-xs, 0.75rem)"
				role="heading"
				aria-level="3"
				aria-label="Category: {story.category}"
			>
				{#if categoryEmoji}
					<span aria-hidden="true" class="me-1">{categoryEmoji}</span>
				{/if}
				<!-- category translates independently of the title, so a title-first
				     stream can leave it in the source language (KNEWS-453). -->
				<span class={getTopicColorClass(story.category)} dir={categoryDir}>
					{story.category}
				</span>
			</div>

			<!-- AI Tools - Only show when expanded and user is subscriber -->
			{#if isExpanded && isSubscriber}
				<div class="flex items-center gap-1">
					<!-- Sparkles Button with chevron toggle -->
					<Tooltip
						text={selectedLevel
							? s('story.simplify.tooltipActive').replace('{level}', selectedLevel)
							: s('story.simplify.tooltip')}
						position="bottom"
					>
						<button
							onclick={handleSimplifyToggle}
							disabled={isSimplifying}
							class="p-1 rounded hover:bg-primary-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label="Toggle simplify options"
							aria-expanded={showSimplifySelector}
						>
							<IconSparkles
								size={16}
								class={selectedLevel ? 'text-accent-links' : 'text-primary-600'}
							/>
						</button>
					</Tooltip>

					<!-- Reading level buttons (shown when expanded) -->
					{#if showSimplifySelector}
						<div role="group" aria-label="Reading level options" class="flex items-center gap-1">
							<button
								onclick={() => onSimplifyLevelSelect?.('very-simple')}
								disabled={isSimplifying}
								class={selectedLevel === 'very-simple'
									? 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-100 dark:bg-purple-900 text-accent-links'
									: 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary-50 dark:bg-graphite-800 text-primary-700 hover:bg-primary-100 dark:hover:bg-graphite-700'}
								aria-label="Very simple reading level"
								aria-pressed={selectedLevel === 'very-simple'}
							>
								{s('story.simplify.verySimple')}
							</button>
							<button
								onclick={() => onSimplifyLevelSelect?.('simple')}
								disabled={isSimplifying}
								class={selectedLevel === 'simple'
									? 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-100 dark:bg-purple-900 text-accent-links'
									: 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary-50 dark:bg-graphite-800 text-primary-700 hover:bg-primary-100 dark:hover:bg-graphite-700'}
								aria-label="Simple reading level"
								aria-pressed={selectedLevel === 'simple'}
							>
								{s('story.simplify.simple')}
							</button>
							<button
								onclick={() => onSimplifyLevelSelect?.('normal')}
								disabled={isSimplifying}
								class={selectedLevel === 'normal'
									? 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-100 dark:bg-purple-900 text-accent-links'
									: 'px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary-50 dark:bg-graphite-800 text-primary-700 hover:bg-primary-100 dark:hover:bg-graphite-700'}
								aria-label="Normal reading level"
								aria-pressed={selectedLevel === 'normal'}
							>
								{s('story.simplify.normal')}
							</button>
						</div>
					{/if}

					<!-- Flashcard buttons (hidden for CJK stories as word selection doesn't work without spaces) -->
					{#if !isCJKStory}
						{#if exportedCSV}
							<!-- Download button (after export is complete) -->
							<Tooltip text={s('story.flashcards.downloadTooltip')} position="bottom">
								<button
									onclick={onDownloadClick}
									class="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-accent-links hover:bg-purple-200 dark:hover:bg-purple-800 transition-all flex items-center gap-1.5 text-xs font-medium"
									aria-label="Download flashcards CSV"
								>
									<IconCards size={16} class="text-accent-links" />
									{s('story.flashcards.download')}
								</button>
							</Tooltip>
						{:else}
							<!-- Selection mode buttons -->
							<Tooltip
								text={flashcardMode
									? s('story.flashcards.tooltipExit')
									: s('story.flashcards.tooltip')}
								position="bottom"
							>
								<button
									onclick={onFlashcardsClick}
									disabled={isExporting}
									class={`transition-all rounded flex items-center gap-1.5 ${flashcardMode ? 'px-2 py-1 bg-purple-100 dark:bg-purple-900 text-accent-links' : 'p-1 hover:bg-primary-50'} ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
									aria-label={flashcardMode
										? s('story.flashcards.tooltipExit')
										: s('story.flashcards.tooltip')}
								>
									<IconCards
										size={16}
										class={flashcardMode ? 'text-accent-links' : 'text-primary-600'}
									/>
									{#if flashcardMode}
										<span class="text-xs font-medium">
											{selectedWordsCount > 0
												? s('story.flashcards.selectedCount').replace(
														'{count}',
														String(selectedWordsCount),
													)
												: s('story.flashcards.selectWords')}
										</span>
									{/if}
								</button>
							</Tooltip>

							<!-- Export button (only visible when words are selected and not exporting) -->
							{#if flashcardMode && selectedWordsCount > 0 && !isExporting}
								<Tooltip text={s('story.flashcards.exportTooltip')} position="bottom">
									<button
										onclick={onExportClick}
										class="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 transition-all flex items-center text-xs font-medium"
										aria-label="Export selected words to Anki"
									>
										{s('story.flashcards.export')}
									</button>
								</Tooltip>
							{/if}

							<!-- Exporting spinner -->
							{#if isExporting}
								<div
									class="flex items-center gap-2 px-2 py-0.5 text-xs text-primary-600 ml-1"
									role="status"
									aria-live="polite"
								>
									<svg
										class="animate-spin h-3 w-3"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									<span>{s('story.flashcards.generating')}</span>
								</div>
							{/if}
						{/if}
					{/if}

					{#if ttsStatus === 'loading'}
						<!-- Loading state -->
						<Tooltip text={s('story.tts.tooltipLoading')} position="bottom">
							<button
								onclick={onTtsClick}
								class="p-1 rounded bg-primary-50 transition-colors"
								aria-label="Cancel audio loading"
							>
								<svg
									class="animate-spin h-4 w-4 text-primary-600"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							</button>
						</Tooltip>
					{:else if ttsStatus === 'playing'}
						<!-- Playing state -->
						<Tooltip text={s('story.tts.tooltipStop')} position="bottom">
							<button
								onclick={onTtsClick}
								class="p-1 rounded bg-purple-100 dark:bg-purple-900 transition-colors"
								aria-label="Stop audio playback"
							>
								<IconVolume size={16} class="text-accent-links" />
							</button>
						</Tooltip>
					{:else}
						<!-- Idle state -->
						<Tooltip text={s('story.tts.tooltip')} position="bottom">
							<button
								onclick={onTtsClick}
								class="p-1 rounded hover:bg-primary-50 transition-colors"
								aria-label="Read story aloud"
							>
								<IconVolume size={16} class="text-primary-600" />
							</button>
						</Tooltip>
					{/if}

					<!-- Ask Assistant toggle (logged-in users only) -->
					{#if isLoggedIn}
						<Tooltip text={s('story.assistant.tooltip')} position="bottom">
							<button
								onclick={() => (showAssistantInput = !showAssistantInput)}
								class={`transition-all rounded flex items-center gap-1.5 ${showAssistantInput ? 'px-2 py-1 bg-purple-100 dark:bg-purple-900 text-accent-links' : 'p-1 hover:bg-primary-50'}`}
								aria-label={s('story.assistant.tooltip')}
								aria-expanded={showAssistantInput}
								type="button"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									xmlns="http://www.w3.org/2000/svg"
									class={showAssistantInput ? 'text-accent-links' : 'text-primary-600'}
								>
									<circle cx="12" cy="12" r="11.25"></circle>
									<circle cx="12" cy="12" r="7.75"></circle>
									<path
										d="M19.2 14.9c-1.1.5-2.1 1.1-4.2 1.1-4 0-5-3-8.5-3-.9 0-1.6.1-2.1.3m15-3.5c-1.1.5-2.1 1.2-4.4 1.2-4 0-5-3-8.5-3-.4 0-.8 0-1.2.1"
									></path>
								</svg>
								{#if showAssistantInput}
									<span class="text-xs font-medium">{s('story.assistant.tooltip')}</span>
								{/if}
							</button>
						</Tooltip>
					{/if}

					<!-- Progress/Status (appears at the end after everything) -->
					{#if isSimplifying}
						<div
							class="flex items-center gap-2 px-2 py-0.5 text-xs text-primary-600 ml-1"
							role="status"
							aria-live="polite"
						>
							<svg
								class="animate-spin h-3 w-3"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>{s('story.simplify.loading')}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</header>
{/if}

<!-- Story Title and Read Button -->
<div class="flex items-start">
	<div class="flex-grow">
		<button
			class="dark:text-dark-text mb-2 flex cursor-pointer items-center text-xl text-primary-800 text-start w-full bg-transparent border-none p-0 focus-visible-ring rounded"
			class:font-semibold={!isRead}
			style="font-size: var(--text-xl, 1.25rem)"
			onclick={onTitleClick}
			aria-label="Expand story"
			aria-expanded="false"
		>
			{#if articleEmoji}
				<span aria-hidden="true" class="me-2">{articleEmoji}</span>
			{/if}
			<span dir={contentDir} class:kite-translating-shimmer={titleTranslating}>{displayTitle}</span>
		</button>
	</div>

	<!-- Read Status Button -->
	{#if !isSharedView}
		<div class="-mt-3 ms-4 flex-shrink-0">
			<button
				onclick={onReadClick}
				class="focus-visible-ring rounded"
				title={s('article.readStatus') || 'Mark as read'}
				aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
			>
				<svg
					class="h-6 w-6"
					class:text-accent-links={isRead}
					class:text-primary-200={!isRead}
					class:dark:text-primary-600={!isRead}
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 19 19"
					fill={isRead ? '#7BA3FF' : 'currentColor'}
					stroke={isRead ? '#427AFC' : 'none'}
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	{/if}
</div>

{#if isExpanded && story.corrections && story.corrections.length > 0 && !settingsLock.getManagedOption('hideCorrections', true)}
	<StoryCorrections corrections={story.corrections} storyId={story.id} {contentDir} />
{/if}

<!-- Assistant question input (below title, full width) -->
{#if showAssistantInput && isLoggedIn && isExpanded}
	<form
		onsubmit={(e) => {
			e.preventDefault();
			submitAssistantQuestion();
		}}
		class="flex items-center gap-2 mb-2"
	>
		<input
			type="text"
			bind:value={assistantQuestion}
			placeholder={s('story.assistant.placeholder')}
			class="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-primary-200 bg-modal-bg text-primary placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent"
			onkeydown={(e) => e.stopPropagation()}
			autofocus
		/>
		<button
			type="submit"
			disabled={!assistantQuestion.trim()}
			class="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 font-medium"
		>
			{s('story.assistant.submit')}
		</button>
	</form>
{/if}
