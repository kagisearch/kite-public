/**
 * Toast notification store
 * Simple store for showing temporary toast notifications
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
	id: string;
	message: string;
	type: ToastType;
	duration?: number; // milliseconds, default 5000
	action?: {
		label: string;
		onClick: () => void;
	};
};

class ToastStore {
	toasts = $state<Toast[]>([]);

	/**
	 * Show a toast notification
	 */
	show(
		message: string,
		type: ToastType = 'info',
		options?: { duration?: number; action?: { label: string; onClick: () => void } },
	): string {
		const id = Math.random().toString(36).substring(7);
		const duration = options?.duration ?? 5000;

		const toast: Toast = {
			id,
			message,
			type,
			duration,
			action: options?.action,
		};

		this.toasts = [...this.toasts, toast];

		// Auto-dismiss after duration
		if (duration > 0) {
			setTimeout(() => {
				this.dismiss(id);
			}, duration);
		}

		return id;
	}

	/**
	 * Dismiss a toast by ID
	 */
	dismiss(id: string): void {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	/**
	 * Clear all toasts
	 */
	clear(): void {
		this.toasts = [];
	}

	/**
	 * Convenience methods for different toast types
	 */
	info(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
		return this.show(message, 'info', options);
	}

	success(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
		return this.show(message, 'success', options);
	}

	warning(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
		return this.show(message, 'warning', options);
	}

	error(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
		return this.show(message, 'error', options);
	}
}

export const toastStore = new ToastStore();