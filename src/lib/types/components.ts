/**
 * Type definitions for Svelte component instances
 */

// StoryList component instance type
export interface StoryListInstance {
	toggleExpandAll(): void;
	toggleReadStatus(index: number): void;
}

// CategoryNavigation component instance type
export interface CategoryNavigationInstance {
	getCategoryElement(categoryId: string): HTMLElement | null;
}

// HistoryManager component instance type
export interface HistoryManagerInstance {
	updateUrl(params?: { categoryId?: string; storyIndex?: number | null; isShared?: boolean }): void;
}
