/**
 * Scroll lock utility using position:fixed approach.
 * This is the most reliable cross-browser method to prevent background scrolling.
 */
class ScrollLock {
	private isLocked = false;
	private scrollY = 0;

	lock() {
		if (this.isLocked) return;

		// Save current scroll position
		this.scrollY = window.scrollY;

		// Apply fixed positioning to body - this completely prevents scrolling
		document.body.style.position = 'fixed';
		document.body.style.top = `-${this.scrollY}px`;
		document.body.style.left = '0';
		document.body.style.right = '0';

		this.isLocked = true;
	}

	unlock() {
		if (!this.isLocked) return;

		// Remove fixed positioning
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.left = '';
		document.body.style.right = '';

		// Restore scroll position
		window.scrollTo(0, this.scrollY);

		this.isLocked = false;
	}
}

export const scrollLock = new ScrollLock();
