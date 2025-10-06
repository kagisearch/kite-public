import { browser } from '$app/environment';
import { syncManager } from '$lib/client/sync-manager';
import { imagePreloadingService, type PreloadConfig } from '$lib/services/imagePreloadingService';

/**
 * Reactive store for image preloading configuration
 */
class PreloadingConfigStore {
	private config = $state<PreloadConfig>({
		enabledInTimeTravelMode: false,
		enabledOnMobile: false,
		categoryPreloadDelay: 500,
		storyPreloadDelay: 0,
		viewportMargin: '100px',
		logLevel: 'info',
		preloadTimeout: 2000,
	});

	constructor() {
		// Load saved config from localStorage on initialization
		if (browser) {
			this.loadFromStorage();
			// Configure the service with initial config
			imagePreloadingService.configure(this.config);
		}
	}

	/**
	 * Get current configuration
	 */
	get current(): PreloadConfig {
		return this.config;
	}

	/**
	 * Getters for individual properties
	 */
	get enabled(): boolean {
		// General enabled state - true if enabled for either time travel or mobile
		return this.config.enabledInTimeTravelMode || this.config.enabledOnMobile;
	}

	get enabledInTimeTravelMode(): boolean {
		return this.config.enabledInTimeTravelMode;
	}

	get enableOnMobile(): boolean {
		return this.config.enabledOnMobile;
	}

	get categoryPreloadDelay(): number {
		return this.config.categoryPreloadDelay;
	}

	get preloadTimeout(): number {
		return this.config.preloadTimeout;
	}

	get debugLogging(): boolean {
		return this.config.logLevel === 'verbose';
	}

	/**
	 * Update configuration
	 */
	update(newConfig: Partial<PreloadConfig>) {
		this.config = { ...this.config, ...newConfig };
		this.saveToStorage();
		// Sync with the preloading service
		imagePreloadingService.configure(this.config);
	}

	/**
	 * Reset to defaults
	 */
	reset() {
		this.config = {
			enabledInTimeTravelMode: false,
			enabledOnMobile: false,
			categoryPreloadDelay: 500,
			storyPreloadDelay: 0,
			viewportMargin: '100px',
			logLevel: 'info',
			preloadTimeout: 2000,
		};
		this.saveToStorage();
		// Sync with the preloading service
		imagePreloadingService.configure(this.config);
	}

	/**
	 * Toggle time travel mode preloading
	 */
	toggleTimeTravelPreloading() {
		this.update({
			enabledInTimeTravelMode: !this.config.enabledInTimeTravelMode,
		});
	}

	/**
	 * Toggle mobile preloading
	 */
	toggleMobilePreloading() {
		this.update({ enabledOnMobile: !this.config.enabledOnMobile });
	}

	/**
	 * Set log level
	 */
	setLogLevel(level: PreloadConfig['logLevel']) {
		this.update({ logLevel: level });
	}

	/**
	 * Setter methods for individual properties
	 */
	setEnabled(value: boolean) {
		// If disabling, disable both mobile and time travel
		if (!value) {
			this.update({ enabledInTimeTravelMode: false, enabledOnMobile: false });
		} else {
			// If enabling, enable mobile by default
			this.update({ enabledOnMobile: true });
		}
	}

	setEnableOnMobile(value: boolean) {
		this.update({ enabledOnMobile: value });
	}

	setCategoryPreloadDelay(value: number) {
		this.update({ categoryPreloadDelay: value });
	}

	setPreloadTimeout(value: number) {
		this.update({ preloadTimeout: value });
	}

	setDebugLogging(value: boolean) {
		this.update({ logLevel: value ? 'verbose' : 'info' });
	}

	/**
	 * Load configuration from localStorage
	 */
	private loadFromStorage() {
		try {
			const saved = localStorage.getItem('kite-preloading-config');
			if (saved) {
				const parsed = JSON.parse(saved);
				this.config = { ...this.config, ...parsed };
				// Sync loaded config with the service
				imagePreloadingService.configure(this.config);
			}
		} catch (error) {
			console.warn('Failed to load preloading config from storage:', error);
		}
	}

	/**
	 * Save configuration to localStorage
	 */
	private saveToStorage() {
		if (!browser) return;

		try {
			localStorage.setItem('kite-preloading-config', JSON.stringify(this.config));

			// Track changes for sync - sync the entire config as one setting
			if (syncManager) {
				syncManager.trackSettingChange('kite-preloading-config', JSON.stringify(this.config));
			}
		} catch (error) {
			console.warn('Failed to save preloading config to storage:', error);
		}
	}
}

// Export singleton instance
export const preloadingConfig = new PreloadingConfigStore();
