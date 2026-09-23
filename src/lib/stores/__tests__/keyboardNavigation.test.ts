import { keyboardNavigation } from '../keyboardNavigation.svelte';
import { beforeEach, describe, expect, it } from 'vitest';

describe('keyboardNavigation store', () => {
	beforeEach(() => {
		keyboardNavigation.reset();
		keyboardNavigation.setTotalStories(0);
	});

	describe('selectNext', () => {
		it('should select the first story from no selection', () => {
			keyboardNavigation.setTotalStories(5);
			expect(keyboardNavigation.selectedIndex).toBe(-1);

			keyboardNavigation.selectNext();
			expect(keyboardNavigation.selectedIndex).toBe(0);
		});

		it('should advance to the next story', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(2);

			keyboardNavigation.selectNext();
			expect(keyboardNavigation.selectedIndex).toBe(3);
		});

		it('should not go past the last story', () => {
			keyboardNavigation.setTotalStories(3);
			keyboardNavigation.selectStory(2); // last index

			keyboardNavigation.selectNext();
			expect(keyboardNavigation.selectedIndex).toBe(2);
		});

		it('should do nothing when there are no stories', () => {
			keyboardNavigation.setTotalStories(0);
			keyboardNavigation.selectNext();
			expect(keyboardNavigation.selectedIndex).toBe(-1);
		});
	});

	describe('selectPrevious', () => {
		it('should select the first story from no selection', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectPrevious();
			expect(keyboardNavigation.selectedIndex).toBe(0);
		});

		it('should move to the previous story', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(3);

			keyboardNavigation.selectPrevious();
			expect(keyboardNavigation.selectedIndex).toBe(2);
		});

		it('should not go below index 0', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(0);

			keyboardNavigation.selectPrevious();
			expect(keyboardNavigation.selectedIndex).toBe(0);
		});
	});

	describe('hasSelection', () => {
		it('should return false when no story is selected', () => {
			keyboardNavigation.setTotalStories(5);
			expect(keyboardNavigation.hasSelection).toBe(false);
		});

		it('should return true when a valid story is selected', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(2);
			expect(keyboardNavigation.hasSelection).toBe(true);
		});

		it('should return false when selectedIndex >= totalStories', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(4);
			expect(keyboardNavigation.hasSelection).toBe(true);

			// Shrink total stories so selected index is out of bounds
			keyboardNavigation.setTotalStories(3);
			// setTotalStories clamps to total - 1
			expect(keyboardNavigation.selectedIndex).toBe(2);
			expect(keyboardNavigation.hasSelection).toBe(true);
		});
	});

	describe('setTotalStories', () => {
		it('should clamp selection when stories shrink', () => {
			keyboardNavigation.setTotalStories(10);
			keyboardNavigation.selectStory(8);
			expect(keyboardNavigation.selectedIndex).toBe(8);

			keyboardNavigation.setTotalStories(5);
			expect(keyboardNavigation.selectedIndex).toBe(4); // clamped to last valid index
		});

		it('should reset selection to -1 when stories become empty', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(3);

			keyboardNavigation.setTotalStories(0);
			expect(keyboardNavigation.selectedIndex).toBe(-1);
			expect(keyboardNavigation.hasSelection).toBe(false);
		});

		it('should keep selection when stories grow', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(3);

			keyboardNavigation.setTotalStories(10);
			expect(keyboardNavigation.selectedIndex).toBe(3);
		});
	});

	describe('reset', () => {
		it('should clear selection', () => {
			keyboardNavigation.setTotalStories(5);
			keyboardNavigation.selectStory(3);
			expect(keyboardNavigation.hasSelection).toBe(true);

			keyboardNavigation.reset();
			expect(keyboardNavigation.selectedIndex).toBe(-1);
			expect(keyboardNavigation.hasSelection).toBe(false);
		});
	});

	describe('selectStory', () => {
		it('should not accept out-of-bounds indices', () => {
			keyboardNavigation.setTotalStories(5);

			keyboardNavigation.selectStory(10);
			expect(keyboardNavigation.selectedIndex).toBe(-1); // unchanged

			keyboardNavigation.selectStory(-2);
			expect(keyboardNavigation.selectedIndex).toBe(-1); // unchanged
		});
	});
});
