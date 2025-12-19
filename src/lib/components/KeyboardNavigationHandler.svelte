<script lang="ts">
import { onMount } from 'svelte';
import { keyboardNavigation } from '$lib/stores/keyboardNavigation.svelte';
import type { Story } from '$lib/types';

interface Props {
	stories: Story[];
	currentCategory: string;
	categories: any[]; // Array of categories for navigation
	expandedStories: Record<string, boolean>;
	showSourceOverlay: boolean;
	wikipediaPopupVisible: boolean;
	settingsModalOpen: boolean;
	showSearchModal?: boolean;
	onStoryToggle: (storyId: string) => void;
	onToggleReadStatus?: (index: number) => void;
	onToggleSearchModal?: () => void;
	onCategoryChange?: (categoryId: string) => void;
}

let {
	stories,
	currentCategory,
	categories,
	expandedStories,
	showSourceOverlay,
	wikipediaPopupVisible,
	settingsModalOpen,
	showSearchModal = $bindable(false),
	onStoryToggle,
	onToggleReadStatus,
	onToggleSearchModal,
	onCategoryChange,
}: Props = $props();

// Track last key press for gg combo
let lastKeyTime = 0;
let lastKey = '';

function scrollToSelectedStory() {
	if (!keyboardNavigation.hasSelection) return;

	// Use setTimeout to ensure DOM has updated
	setTimeout(() => {
		const storyElement = document.querySelector(`[data-story-index="${keyboardNavigation.selectedIndex}"]`);
		if (storyElement) {
			storyElement.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
		}
	}, 50);
}

function handleGlobalKeyDown(event: KeyboardEvent) {
	// Don't handle shortcuts if user is typing in an input/textarea or if modals are open (except help)
	const target = event.target as HTMLElement;
	const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

	// Allow Escape and ? even when inputs are focused
	const allowWhenInputFocused = event.key === 'Escape' || event.key === '?';

	if (isInputFocused && !allowWhenInputFocused) {
		return;
	}

	// Cmd+K or Ctrl+K to toggle search
	if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
		event.preventDefault();
		if (onToggleSearchModal) {
			onToggleSearchModal();
		} else {
			showSearchModal = !showSearchModal;
		}
		return;
	}

	// Handle ? to toggle help (works everywhere)
	if (event.key === '?') {
		event.preventDefault();
		keyboardNavigation.toggleHelp();
		return;
	}

	// Don't handle vim-like shortcuts if certain modals are open
	if (settingsModalOpen || showSourceOverlay || wikipediaPopupVisible) {
		return;
	}

	// Close help with Escape
	if (event.key === 'Escape' && keyboardNavigation.showHelp) {
		event.preventDefault();
		keyboardNavigation.closeHelp();
		return;
	}

	// Clear selection with Escape
	if (event.key === 'Escape' && keyboardNavigation.hasSelection) {
		event.preventDefault();
		keyboardNavigation.clearSelection();
		return;
	}

	// h - Previous category
	if (event.key === 'h' && onCategoryChange && categories.length > 0) {
		event.preventDefault();
		const currentIndex = categories.findIndex(cat => cat.id === currentCategory);
		if (currentIndex > 0) {
			onCategoryChange(categories[currentIndex - 1].id);
		} else if (currentIndex === 0) {
			// Wrap around to last category
			onCategoryChange(categories[categories.length - 1].id);
		}
		return;
	}

	// l - Next category
	if (event.key === 'l' && onCategoryChange && categories.length > 0) {
		event.preventDefault();
		const currentIndex = categories.findIndex(cat => cat.id === currentCategory);
		if (currentIndex >= 0 && currentIndex < categories.length - 1) {
			onCategoryChange(categories[currentIndex + 1].id);
		} else if (currentIndex === categories.length - 1) {
			// Wrap around to first category
			onCategoryChange(categories[0].id);
		}
		return;
	}

	// Don't handle story navigation shortcuts on OnThisDay page
	if (currentCategory === 'onthisday') {
		return;
	}

	// Handle gg (go to first story)
	const now = Date.now();
	if (event.key === 'g') {
		if (lastKey === 'g' && now - lastKeyTime < 500) {
			event.preventDefault();
			keyboardNavigation.selectStory(0);
			lastKey = '';
			scrollToSelectedStory();
			return;
		}
		lastKey = 'g';
		lastKeyTime = now;
		return;
	}
	lastKey = event.key;

	// j - Next story
	if (event.key === 'j') {
		event.preventDefault();
		keyboardNavigation.selectNext();
		scrollToSelectedStory();
		return;
	}

	// k - Previous story
	if (event.key === 'k') {
		event.preventDefault();
		keyboardNavigation.selectPrevious();
		scrollToSelectedStory();
		return;
	}

	// G - Go to last story
	if (event.key === 'G') {
		event.preventDefault();
		if (stories.length > 0) {
			keyboardNavigation.selectStory(stories.length - 1);
			scrollToSelectedStory();
		}
		return;
	}

	// Enter - Expand/collapse selected story
	if (event.key === 'Enter' && keyboardNavigation.hasSelection) {
		event.preventDefault();
		const story = stories[keyboardNavigation.selectedIndex];
		if (story) {
			onStoryToggle(story.cluster_number?.toString() || story.title);
		}
		return;
	}

	// o - Open (expand) selected story
	if (event.key === 'o' && keyboardNavigation.hasSelection) {
		event.preventDefault();
		const story = stories[keyboardNavigation.selectedIndex];
		if (story) {
			const storyId = story.cluster_number?.toString() || story.title;
			if (!expandedStories[storyId]) {
				onStoryToggle(storyId);
			}
		}
		return;
	}

	// x - Close (collapse) selected story
	if (event.key === 'x' && keyboardNavigation.hasSelection) {
		event.preventDefault();
		const story = stories[keyboardNavigation.selectedIndex];
		if (story) {
			const storyId = story.cluster_number?.toString() || story.title;
			if (expandedStories[storyId]) {
				onStoryToggle(storyId);
			}
		}
		return;
	}

	// m - Mark as read/unread
	if (event.key === 'm' && keyboardNavigation.hasSelection && onToggleReadStatus) {
		event.preventDefault();
		onToggleReadStatus(keyboardNavigation.selectedIndex);
		return;
	}
}

onMount(() => {
	window.addEventListener('keydown', handleGlobalKeyDown);
	return () => window.removeEventListener('keydown', handleGlobalKeyDown);
});

// Update keyboard navigation state when stories change
$effect(() => {
	keyboardNavigation.setTotalStories(stories.length);
});

// Reset keyboard navigation when changing categories
$effect(() => {
	if (currentCategory) {
		keyboardNavigation.reset();
	}
});
</script>

<!-- This component has no visual output, only keyboard event handling -->
