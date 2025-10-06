import { experimental } from '$lib/stores/experimental.svelte';
import type { Category } from '$lib/types';

interface TouchState {
	startX: number;
	startY: number;
	startTime: number;
	startedOnScrollable: boolean;
	isTracking: boolean;
	lastX: number;
	lastY: number;
	consistentDirectionTime: number;
	initialDirection: 'left' | 'right' | 'none';
}

export class CategorySwipeHandler {
	private touchState: TouchState = {
		startX: 0,
		startY: 0,
		startTime: 0,
		startedOnScrollable: false,
		isTracking: false,
		lastX: 0,
		lastY: 0,
		consistentDirectionTime: 0,
		initialDirection: 'none',
	};

	private categories: Category[] = [];
	private currentCategory: string = '';
	private onCategoryChange: ((category: string) => void) | null = null;

	constructor() {
		// Bind methods to preserve 'this' context
		this.handleTouchStart = this.handleTouchStart.bind(this);
		this.handleTouchMove = this.handleTouchMove.bind(this);
		this.handleTouchEnd = this.handleTouchEnd.bind(this);
	}

	// Update the handler with current state
	public updateState(
		categories: Category[],
		currentCategory: string,
		onCategoryChange: (category: string) => void,
	) {
		this.categories = categories;
		this.currentCategory = currentCategory;
		this.onCategoryChange = onCategoryChange;
	}

	private findScrollableParent(element: Element): Element | null {
		if (!element) return null;

		const parent = element.parentElement;
		if (!parent) return null;

		// Check if parent is scrollable horizontally
		const style = window.getComputedStyle(parent);
		const isScrollable =
			parent.scrollWidth > parent.clientWidth &&
			(style.overflowX === 'auto' || style.overflowX === 'scroll');

		return isScrollable ? parent : this.findScrollableParent(parent);
	}

	private hasTextSelection(): boolean {
		const selection = window.getSelection();
		return selection !== null && selection.toString().length > 0 && selection.type === 'Range';
	}

	private isTouchOnCategoryTabs(target: Element): boolean {
		const categoryTabs = document.querySelector('.category-tabs');
		return categoryTabs !== null && (categoryTabs.contains(target) || categoryTabs === target);
	}

	private isTouchOnInteractiveElement(target: Element): boolean {
		// Check if the touch is on or within interactive elements that should not trigger swipe
		const interactiveSelectors = [
			'.citation-number', // Citation numbers
			'.citation-sources', // Citation source favicons
			'button', // Any button
			'a', // Any link
			'input', // Any input
			'textarea', // Any textarea
			'select', // Any select
			'[role="button"]', // Elements with button role
			'[tabindex="0"]', // Elements that are keyboard focusable (like citations)
		];

		// Check if target matches any interactive selector
		for (const selector of interactiveSelectors) {
			if (target.matches(selector) || target.closest(selector)) {
				return true;
			}
		}

		return false;
	}

	private changeToCategory(direction: 'next' | 'previous'): void {
		if (!this.onCategoryChange || this.categories.length === 0) return;

		const currentIndex = this.categories.findIndex((cat) => cat.id === this.currentCategory);

		if (currentIndex === -1) return;

		let nextIndex: number;
		if (direction === 'next') {
			nextIndex = currentIndex + 1;
			// Don't wrap around - if at the end, do nothing
			if (nextIndex >= this.categories.length) return;
		} else {
			nextIndex = currentIndex - 1;
			// Don't wrap around - if at the beginning, do nothing
			if (nextIndex < 0) return;
		}

		const nextCategory = this.categories[nextIndex];
		this.onCategoryChange(nextCategory.id);

		// Scroll the new active category into view
		setTimeout(() => {
			const selectedTab = document.querySelector('.category-tab.active');
			if (selectedTab) {
				selectedTab.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'center',
				});
			}
		}, 100);
	}

	public handleTouchStart(event: TouchEvent): void {
		// Check if swipe is disabled in experimental settings
		if (experimental.disableCategorySwipe) return;

		const target = event.target as Element;

		// Don't track if touch started on an interactive element
		if (this.isTouchOnInteractiveElement(target)) {
			return;
		}

		const touch = event.changedTouches[0];
		this.touchState.startX = touch.screenX;
		this.touchState.startY = touch.screenY;
		this.touchState.startTime = Date.now();
		this.touchState.lastX = touch.screenX;
		this.touchState.lastY = touch.screenY;
		this.touchState.isTracking = true;
		this.touchState.consistentDirectionTime = 0;
		this.touchState.initialDirection = 'none';

		// Check if touch started on a scrollable element
		const scrollableParent = this.findScrollableParent(target);
		this.touchState.startedOnScrollable = scrollableParent !== null;
	}

	public handleTouchMove(event: TouchEvent): void {
		// Check if swipe is disabled in experimental settings
		if (experimental.disableCategorySwipe) return;

		if (!this.touchState.isTracking) return;

		const touch = event.changedTouches[0];
		const currentX = touch.screenX;
		const currentY = touch.screenY;

		// Calculate movement from start
		const deltaXFromStart = this.touchState.startX - currentX;
		const deltaYFromStart = this.touchState.startY - currentY;

		// Calculate movement from last position
		const deltaXFromLast = this.touchState.lastX - currentX;

		// Require very horizontal movement (angle must be within 20 degrees of horizontal)
		const angle = Math.abs((Math.atan2(deltaYFromStart, deltaXFromStart) * 180) / Math.PI);
		const isHorizontalEnough = angle < 20 || angle > 160;

		if (!isHorizontalEnough) {
			// Not horizontal enough, stop tracking
			this.touchState.isTracking = false;
			return;
		}

		// Determine current direction
		let currentDirection: 'left' | 'right' | 'none' = 'none';
		if (Math.abs(deltaXFromLast) > 2) {
			// Only count significant movement
			currentDirection = deltaXFromLast > 0 ? 'right' : 'left';
		}

		// Set initial direction on first significant movement
		if (this.touchState.initialDirection === 'none' && currentDirection !== 'none') {
			this.touchState.initialDirection = currentDirection;
			this.touchState.consistentDirectionTime = Date.now();
		}

		// Check if direction is consistent with initial direction
		if (currentDirection !== 'none' && currentDirection === this.touchState.initialDirection) {
			// Direction is consistent, continue tracking
		} else if (
			currentDirection !== 'none' &&
			currentDirection !== this.touchState.initialDirection
		) {
			// Direction changed, stop tracking
			this.touchState.isTracking = false;
			return;
		}

		this.touchState.lastX = currentX;
		this.touchState.lastY = currentY;
	}

	public handleTouchEnd(event: TouchEvent): void {
		// Check if swipe is disabled in experimental settings
		if (experimental.disableCategorySwipe) return;

		// Reset tracking state
		const wasTracking = this.touchState.isTracking;
		this.touchState.isTracking = false;

		// Don't proceed if we weren't tracking a valid swipe
		if (!wasTracking) {
			return;
		}

		// Check if there's text selection
		if (this.hasTextSelection()) {
			return;
		}

		// Don't handle if touch started on a scrollable element
		if (this.touchState.startedOnScrollable) {
			return;
		}

		// Check if the touch started on or within the category tabs
		const target = event.target as Element;
		if (this.isTouchOnCategoryTabs(target)) {
			return;
		}

		const currentTime = Date.now();
		const swipeDuration = currentTime - this.touchState.startTime;
		const directionConsistentDuration = currentTime - this.touchState.consistentDirectionTime;

		// Require minimum time in consistent direction (800ms)
		if (directionConsistentDuration < 800) {
			return;
		}

		// Require total swipe to not be too fast (prevent accidental quick taps)
		if (swipeDuration < 300) {
			return;
		}

		const touchEndX = event.changedTouches[0].screenX;
		const deltaX = this.touchState.startX - touchEndX;

		// Require significant horizontal distance (100px minimum)
		if (Math.abs(deltaX) < 100) {
			return;
		}

		// Trigger category change based on initial direction
		if (this.touchState.initialDirection === 'right') {
			// Swiped left, go to next category
			this.changeToCategory('next');
		} else if (this.touchState.initialDirection === 'left') {
			// Swiped right, go to previous category
			this.changeToCategory('previous');
		}
	}
}

// Export singleton instance for easy use
export const categorySwipeHandler = new CategorySwipeHandler();
