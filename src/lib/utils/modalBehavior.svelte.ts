import { scrollLock } from './scrollLock.js';

/**
 * Shared modal behavior logic for consistent modal handling across components
 */
export function createModalBehavior() {
	let isDesktop = $state(false);

	// Check if desktop on mount
	$effect(() => {
		if (typeof window !== 'undefined') {
			isDesktop = window.innerWidth >= 768;

			// Update on resize
			const handleResize = () => {
				isDesktop = window.innerWidth >= 768;
			};

			window.addEventListener('resize', handleResize);
			return () => window.removeEventListener('resize', handleResize);
		}
	});

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent, onClose: () => void) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent, isOpen: boolean, onClose: () => void) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}

	// Apply scroll lock when modal is open
	// This should be called inside a component's $effect
	function applyScrollLock(isOpen: boolean) {
		if (isOpen) {
			scrollLock.lock();
		} else {
			scrollLock.unlock();
		}
	}

	// Get transition duration based on device type
	function getTransitionDuration(): number {
		return isDesktop ? 100 : 0;
	}

	// Get common modal classes
	function getBackdropClasses(zIndex = 80): string {
		return `fixed inset-0 z-[${zIndex}] flex items-center justify-center bg-black/60 dark:bg-black/80`;
	}

	function getModalClasses(fullScreenOnMobile = true): string {
		if (fullScreenOnMobile) {
			return 'flex h-full w-full flex-col bg-white shadow-xl md:h-auto md:rounded-lg dark:bg-gray-800';
		}
		return 'flex flex-col bg-white shadow-xl rounded-lg dark:bg-gray-800';
	}

	return {
		get isDesktop() {
			return isDesktop;
		},
		handleBackdropClick,
		handleKeydown,
		applyScrollLock,
		getTransitionDuration,
		getBackdropClasses,
		getModalClasses,
	};
}
