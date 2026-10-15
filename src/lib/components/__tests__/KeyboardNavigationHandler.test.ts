import { keyboardNavigation } from '$lib/stores/keyboardNavigation.svelte';
import type { Story } from '$lib/types';
import KeyboardNavigationHandler from '../KeyboardNavigationHandler.svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeStory(overrides: Partial<Story> = {}): Story {
	return {
		title: `Story ${Math.random().toString(36).slice(2, 8)}`,
		id: crypto.randomUUID(),
		cluster_number: Math.floor(Math.random() * 1000),
		...overrides,
	} as Story;
}

describe('KeyboardNavigationHandler', () => {
	let stories: Story[];
	let onStoryToggle: (storyId: string) => void;
	let onToggleReadStatus: (index: number) => void;
	let onMarkAllAsRead: () => void;
	let onCategoryChange: (categoryId: string) => void;

	beforeEach(() => {
		keyboardNavigation.reset();
		keyboardNavigation.setTotalStories(0);
		keyboardNavigation.closeHelp();

		stories = [makeStory(), makeStory(), makeStory()];
		onStoryToggle = vi.fn();
		onToggleReadStatus = vi.fn();
		onMarkAllAsRead = vi.fn();
		onCategoryChange = vi.fn();
	});

	function renderHandler(props: Record<string, unknown> = {}) {
		return render(KeyboardNavigationHandler, {
			props: {
				stories,
				currentCategory: 'world',
				categories: [{ id: 'world' }, { id: 'tech' }, { id: 'science' }],
				expandedStories: {},
				showSourceOverlay: false,
				wikipediaPopupVisible: false,
				settingsModalOpen: false,
				onStoryToggle,
				onToggleReadStatus,
				onMarkAllAsRead,
				onCategoryChange,
				...props,
			},
		});
	}

	describe('j/k navigation respects stories array bounds', () => {
		it('should not navigate past the last story in the array', async () => {
			renderHandler();
			// stories has 3 items (indices 0, 1, 2)

			// Press j 5 times — should stop at index 2
			for (let i = 0; i < 5; i++) {
				await fireEvent.keyDown(window, { key: 'j' });
			}

			expect(keyboardNavigation.selectedIndex).toBe(2);
		});

		it('should navigate correctly with a small stories array', async () => {
			stories = [makeStory()]; // only 1 story
			renderHandler();

			await fireEvent.keyDown(window, { key: 'j' });
			expect(keyboardNavigation.selectedIndex).toBe(0);

			await fireEvent.keyDown(window, { key: 'j' });
			expect(keyboardNavigation.selectedIndex).toBe(0); // can't go further
		});
	});

	describe('action keys use the correct stories array', () => {
		it('o key should call onStoryToggle with the correct story ID', async () => {
			renderHandler();

			// Select first story
			await fireEvent.keyDown(window, { key: 'j' });
			expect(keyboardNavigation.selectedIndex).toBe(0);

			// Press o to open
			await fireEvent.keyDown(window, { key: 'o' });
			expect(onStoryToggle).toHaveBeenCalledWith(stories[0].id);
		});

		it('Enter key should call onStoryToggle with the correct story ID', async () => {
			renderHandler();

			// Navigate to second story
			await fireEvent.keyDown(window, { key: 'j' });
			await fireEvent.keyDown(window, { key: 'j' });
			expect(keyboardNavigation.selectedIndex).toBe(1);

			await fireEvent.keyDown(window, { key: 'Enter' });
			expect(onStoryToggle).toHaveBeenCalledWith(stories[1].id);
		});

		it('x key should call onStoryToggle only when story is expanded', async () => {
			const expanded: Record<string, boolean> = {};
			expanded[stories[0].id!] = true;

			renderHandler({ expandedStories: expanded });

			// Select first story
			await fireEvent.keyDown(window, { key: 'j' });

			// Press x to close — story is expanded, should toggle
			await fireEvent.keyDown(window, { key: 'x' });
			expect(onStoryToggle).toHaveBeenCalledWith(stories[0].id);
		});

		it('x key should not call onStoryToggle when story is collapsed', async () => {
			renderHandler({ expandedStories: {} });

			// Select first story
			await fireEvent.keyDown(window, { key: 'j' });

			// Press x — story is not expanded, should not toggle
			await fireEvent.keyDown(window, { key: 'x' });
			expect(onStoryToggle).not.toHaveBeenCalled();
		});

		it('m key should call onToggleReadStatus with the selected index', async () => {
			renderHandler();

			// Navigate to third story (index 2)
			await fireEvent.keyDown(window, { key: 'j' });
			await fireEvent.keyDown(window, { key: 'j' });
			await fireEvent.keyDown(window, { key: 'j' });
			expect(keyboardNavigation.selectedIndex).toBe(2);

			await fireEvent.keyDown(window, { key: 'm' });
			expect(onToggleReadStatus).toHaveBeenCalledWith(2);
		});
	});

	describe('action keys require selection', () => {
		it('should not fire onStoryToggle when no story is selected', async () => {
			renderHandler();
			expect(keyboardNavigation.hasSelection).toBe(false);

			await fireEvent.keyDown(window, { key: 'o' });
			await fireEvent.keyDown(window, { key: 'Enter' });
			await fireEvent.keyDown(window, { key: 'x' });
			await fireEvent.keyDown(window, { key: 'm' });

			expect(onStoryToggle).not.toHaveBeenCalled();
			expect(onToggleReadStatus).not.toHaveBeenCalled();
		});
	});

	describe('Shift+M marks all stories as read', () => {
		it('should call onMarkAllAsRead without requiring a selection', async () => {
			renderHandler();
			expect(keyboardNavigation.hasSelection).toBe(false);

			await fireEvent.keyDown(window, { key: 'M' });
			expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
		});

		it('should not fire when a modifier other than Shift is held', async () => {
			renderHandler();

			await fireEvent.keyDown(window, { key: 'M', metaKey: true });
			await fireEvent.keyDown(window, { key: 'M', ctrlKey: true });
			await fireEvent.keyDown(window, { key: 'M', altKey: true });

			expect(onMarkAllAsRead).not.toHaveBeenCalled();
		});

		it('should not fire lowercase m as mark-all', async () => {
			renderHandler();

			// Select a story so plain `m` has something to toggle
			await fireEvent.keyDown(window, { key: 'j' });
			await fireEvent.keyDown(window, { key: 'm' });

			expect(onMarkAllAsRead).not.toHaveBeenCalled();
			expect(onToggleReadStatus).toHaveBeenCalledWith(0);
		});
	});

	describe('keys are ignored when modals are open', () => {
		it('should ignore navigation keys when settings modal is open', async () => {
			renderHandler({ settingsModalOpen: true });

			await fireEvent.keyDown(window, { key: 'j' });
			expect(keyboardNavigation.selectedIndex).toBe(-1);
		});

		it('should ignore navigation keys when source overlay is open', async () => {
			renderHandler({ showSourceOverlay: true });

			await fireEvent.keyDown(window, { key: 'j' });
			expect(keyboardNavigation.selectedIndex).toBe(-1);
		});

		it('should ignore Shift+M when settings modal is open', async () => {
			renderHandler({ settingsModalOpen: true });

			await fireEvent.keyDown(window, { key: 'M' });
			expect(onMarkAllAsRead).not.toHaveBeenCalled();
		});
	});

	describe('regression: stories array determines navigation bounds', () => {
		it('should use the provided stories array for bounds, not some larger set', async () => {
			// This is the core regression test: if we pass only 3 filtered stories,
			// navigation should be bounded to those 3 stories, not some larger unfiltered set.
			const filteredStories = [makeStory(), makeStory(), makeStory()];
			renderHandler({ stories: filteredStories });

			// Navigate to each story
			await fireEvent.keyDown(window, { key: 'j' }); // 0
			await fireEvent.keyDown(window, { key: 'j' }); // 1
			await fireEvent.keyDown(window, { key: 'j' }); // 2
			await fireEvent.keyDown(window, { key: 'j' }); // still 2 — bounded

			expect(keyboardNavigation.selectedIndex).toBe(2);

			// Action key should reference the correct story from filteredStories
			await fireEvent.keyDown(window, { key: 'Enter' });
			expect(onStoryToggle).toHaveBeenCalledWith(filteredStories[2].id);
		});
	});
});
