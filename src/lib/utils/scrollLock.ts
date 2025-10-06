import { OverlayScrollbars } from 'overlayscrollbars';

/**
 * Scroll lock utility that works with OverlayScrollbars
 */
class ScrollLock {
	private isLocked = false;
	private lockCount = 0;
	private mainScrollbarInstance: OverlayScrollbars | null = null;

	lock() {
		this.lockCount++;

		if (this.isLocked) return;

		// Find the main OverlayScrollbars instance on the body
		const instance = OverlayScrollbars(document.body);
		this.mainScrollbarInstance = instance || null;

		if (this.mainScrollbarInstance) {
			// Disable the main scrollbars
			this.mainScrollbarInstance.options({
				scrollbars: {
					autoHide: 'never',
					autoHideDelay: 0,
				},
				overflow: {
					x: 'hidden',
					y: 'hidden',
				},
			});
		}

		this.isLocked = true;
	}

	unlock() {
		this.lockCount--;

		if (this.lockCount > 0) return;

		if (!this.isLocked) return;

		if (this.mainScrollbarInstance) {
			// Re-enable the main scrollbars
			this.mainScrollbarInstance.options({
				scrollbars: {
					autoHide: 'leave',
					autoHideDelay: 100,
				},
				overflow: {
					x: 'visible',
					y: 'scroll',
				},
			});
		}

		this.isLocked = false;
		this.lockCount = 0;
	}
}

// Export singleton instance
export const scrollLock = new ScrollLock();
