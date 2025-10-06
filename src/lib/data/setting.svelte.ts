import { browser } from '$app/environment';
import { syncSettingsWatcher } from '$lib/client/sync-settings-watcher.svelte';
import { safeGetItem, safeRemoveItem, safeSetItem } from '$lib/client/utils/safe-storage';

type StorageStrategy =
	| 'always' // Always store in localStorage
	| 'when_true' // Only store when true, remove when false
	| 'when_false' // Only store when false, remove when true
	| 'when_not_default' // Only store when different from default
	| 'never' // Never store (runtime only)
	| 'custom'; // Custom save/load logic

type CustomHandlers<T> = {
	load?: (context?: { isLoggedIn?: boolean }) => T;
	save?: (value: T) => void;
	cancel?: (originalValue: T, currentValue: T) => void;
};

export class Setting<T = unknown> {
	key: string;
	defaultValue: T;
	currentValue: T = $state()!;
	originalValue: T;
	storageStrategy: StorageStrategy;
	category: string;
	customHandlers?: CustomHandlers<T>;

	constructor(
		key: string,
		defaultValue: T,
		storageStrategy: StorageStrategy = 'always',
		category: string = 'general',
		customHandlers?: CustomHandlers<T>,
	) {
		this.key = key;
		this.defaultValue = defaultValue;
		this.currentValue = defaultValue;
		this.originalValue = defaultValue;
		this.storageStrategy = storageStrategy;
		this.category = category;
		this.customHandlers = customHandlers;
	}

	load(context?: { isLoggedIn?: boolean }): void {
		if (!browser) return;

		// Use custom load handler if provided
		if (this.storageStrategy === 'custom' && this.customHandlers?.load) {
			this.currentValue = this.customHandlers.load(context);
			this.originalValue = this.currentValue;
			return;
		}

		const stored = safeGetItem(this.key);
		if (stored !== null) {
			try {
				// Try to parse as JSON first
				if (
					stored.startsWith('{') ||
					stored.startsWith('[') ||
					stored === 'true' ||
					stored === 'false'
				) {
					this.currentValue = JSON.parse(stored);
				} else {
					// Keep as string
					this.currentValue = stored as T;
				}
			} catch {
				// If parsing fails, use as string
				this.currentValue = stored as T;
			}
		} else {
			this.currentValue = this.defaultValue;
		}

		// Store the original value for rollback
		this.originalValue = this.currentValue;
	}

	save(): void {
		if (!browser) return;

		// Use custom save handler if provided
		if (this.storageStrategy === 'custom' && this.customHandlers?.save) {
			this.customHandlers.save(this.currentValue);
			this.originalValue = this.currentValue;
			return;
		}

		const shouldStore = this.shouldStore();

		if (shouldStore) {
			// Determine how to store the value
			let valueToStore: string;
			if (typeof this.currentValue === 'string') {
				valueToStore = this.currentValue;
			} else if (typeof this.currentValue === 'boolean' || typeof this.currentValue === 'number') {
				valueToStore = String(this.currentValue);
			} else {
				valueToStore = JSON.stringify(this.currentValue);
			}
			safeSetItem(this.key, valueToStore);
		} else {
			safeRemoveItem(this.key);
		}

		// Update original value after successful save
		this.originalValue = this.currentValue;

		// Trigger sync check if watcher is available
		if (syncSettingsWatcher) {
			syncSettingsWatcher.checkForChanges();
		}
	}

	cancel(): void {
		// Use custom cancel handler if provided
		if (this.storageStrategy === 'custom' && this.customHandlers?.cancel) {
			this.customHandlers.cancel(this.originalValue, this.currentValue);
		}

		this.currentValue = this.originalValue;
	}

	reset(): void {
		this.currentValue = this.defaultValue;
	}

	hasChanges(): boolean {
		// Deep comparison for objects
		if (typeof this.currentValue === 'object' && this.currentValue !== null) {
			return JSON.stringify(this.currentValue) !== JSON.stringify(this.originalValue);
		}
		return this.currentValue !== this.originalValue;
	}

	shouldStore(): boolean {
		switch (this.storageStrategy) {
			case 'always':
				return true;
			case 'when_true':
				return Boolean(this.currentValue);
			case 'when_false':
				return !this.currentValue;
			case 'when_not_default':
				// Deep comparison for objects
				if (typeof this.currentValue === 'object' && this.currentValue !== null) {
					return JSON.stringify(this.currentValue) !== JSON.stringify(this.defaultValue);
				}
				return this.currentValue !== this.defaultValue;
			case 'never':
			case 'custom':
				return false;
			default:
				return true;
		}
	}
}
