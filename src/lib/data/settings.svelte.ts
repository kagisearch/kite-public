import { browser } from '$app/environment';
import type { KnPrefs } from './knPrefs';
import { runMigrations } from './migrations';
import { Setting } from './setting.svelte';

// Type for supported languages
export type SupportedLanguage =
	| 'default'
	| 'source'
	| 'custom'
	| 'en'
	| 'pt'
	| 'pt-BR'
	| 'it'
	| 'fr'
	| 'es'
	| 'de'
	| 'nl'
	| 'zh-Hans'
	| 'zh-Hant'
	| 'ja'
	| 'hi'
	| 'uk'
	| 'ar'
	| 'he'
	| 'ca'
	| 'fi'
	| 'ko'
	| 'lb'
	| 'nb'
	| 'pl'
	| 'ru'
	| 'sv'
	| 'th'
	| 'tr'
	| 'et';

// Type definitions for settings
export type Theme = 'system' | 'light' | 'dark';
export type FontSize = 'xs' | 'small' | 'normal' | 'large' | 'xl';
export type StoryExpandMode = 'always' | 'doubleClick' | 'never';
export type StoryOpenMode = 'multiple' | 'single';
export type CategoryHeaderPosition = 'top' | 'bottom';
export type ContentFilter = 'default' | 'family' | 'none';
export type FilterMode = 'hide' | 'blur';
export type FilterScope = 'title' | 'summary' | 'all';
export type MapsProvider = 'auto' | 'kagi' | 'google' | 'openstreetmap' | 'apple';
export type SinglePageMode = 'disabled' | 'sequential' | 'mixed' | 'random';
export type SinglePageMixOrder = 'sequential' | 'mixed' | 'random';
export type LayoutWidth = 'normal' | 'wide' | 'full';
export type FontFamily = 'default' | 'atkinson' | 'opendyslexic' | 'fast';
export type ReadingLevel = 'very-simple' | 'simple' | 'normal';

/**
 * All application settings centralized in one place
 * Uses the Setting class for consistent behavior and sync support
 */

// Define all settings
export const settings = {
	// Theme Settings
	theme: new Setting<Theme>('theme', 'system', 'when_not_default', 'appearance'),

	// Language Settings
	language: new Setting<SupportedLanguage>('kiteLanguage', 'en', 'when_not_default', 'language'),
	// Translation mode: 'default' | 'source' | 'custom' | specific language code
	// Controls how content should be translated/displayed
	dataLanguage: new Setting<SupportedLanguage>(
		'dataLanguage',
		'default',
		'when_not_default',
		'language',
	),
	// Languages the user can read/speak (used when dataLanguage is 'custom')
	// First element is the main language for translations
	contentLanguages: new Setting<SupportedLanguage[]>('contentLanguages', [], 'always', 'language'),

	// Display Settings
	fontSize: new Setting<FontSize>('fontSize', 'normal', 'when_not_default', 'display'),
	fontFamily: new Setting<FontFamily>('fontFamily', 'default', 'when_not_default', 'display'),
	storyCount: new Setting<number>('storyCount', 12, 'when_not_default', 'display'),
	categoryHeaderPosition: new Setting<CategoryHeaderPosition>(
		'categoryHeaderPosition',
		'bottom',
		'when_not_default',
		'display',
	),
	storyExpandMode: new Setting<StoryExpandMode>(
		'storyExpandMode',
		'doubleClick',
		'when_not_default',
		'display',
	),
	storyOpenMode: new Setting<StoryOpenMode>(
		'storyOpenMode',
		'multiple',
		'when_not_default',
		'display',
	),
	useLatestUrls: new Setting<boolean>('useLatestUrls', false, 'when_true', 'display'),
	mapsProvider: new Setting<MapsProvider>('mapsProvider', 'auto', 'when_not_default', 'display'),
	layoutWidth: new Setting<LayoutWidth>('layoutWidth', 'normal', 'when_not_default', 'display'),

	// Category Settings
	categoryOrder: new Setting<string[]>('categoryOrder', [], 'always', 'categories'),
	enabledCategories: new Setting<string[]>('enabledCategories', [], 'always', 'categories'),
	disabledCategories: new Setting<string[]>('disabledCategories', [], 'always', 'categories'),
	singlePageMode: new Setting<SinglePageMode>(
		'singlePageMode',
		'disabled',
		'when_not_default',
		'categories',
	),

	// Content Settings
	contentFilter: new Setting<ContentFilter>(
		'contentFilter',
		'default',
		'when_not_default',
		'content',
	),

	// Global reading level setting (applies to all categories unless overridden)
	globalReadingLevel: new Setting<ReadingLevel>(
		'globalReadingLevel',
		'normal',
		'when_not_default',
		'content',
	),

	// Per-category reading level settings (overrides global setting)
	// Maps category ID to preferred reading level
	categoryReadingLevels: new Setting<Record<string, ReadingLevel>>(
		'categoryReadingLevels',
		{},
		'when_not_default',
		'content',
	),

	// Section Visibility Settings
	sections: new Setting<Record<string, boolean>>(
		'sections',
		{
			showSource: true,
			showTechnicalDetails: false,
			showPerspectives: false,
			showQuestions: false,
			showTimeline: false,
			showSummaryBullets: true,
			showDetailedSummary: true,
		},
		'when_not_default',
		'sections',
	),

	// Experimental Settings
	experimental: new Setting<Record<string, boolean>>(
		'experimental',
		{
			enableReadAloud: false,
			showDebugInfo: false,
			enableAnimations: true,
		},
		'when_not_default',
		'experimental',
	),

	// Preloading Config
	preloadingConfig: new Setting<Record<string, boolean>>(
		'preloadingConfig',
		{
			enablePreloading: true,
			preloadOnHover: false,
		},
		'when_not_default',
		'preloading',
	),

	// UI State
	introShown: new Setting<boolean>('introShown', false, 'when_true', 'ui_state'),
	timeTravelBannerDismissed: new Setting<boolean>(
		'timeTravelBannerDismissed',
		false,
		'when_true',
		'ui_state',
	),

	// Settings Lock (local-only, stores hashed PIN)
	settingsLockPin: new Setting<string>('settingsLockPin', '', 'when_not_default', 'lock'),

	// Managed mode options (local-only, caregiver-configurable when PIN is set)
	managedMode: new Setting<Record<string, boolean>>(
		'managedMode',
		{
			hideFontSize: true,
			hideTimeTravel: true,
			hideSearch: false,
			hideChaosIndex: true,
			hideShareButton: false,
			hideReportButton: true,
			disableKeyboardShortcuts: true,
		},
		'when_not_default',
		'lock',
	),

	// Sync Settings (local-only, not synced) - enabled by default
	syncSettings: new Setting<boolean>('syncSettings', true, 'always', 'sync_local'),
	syncReadHistory: new Setting<boolean>('syncReadHistory', true, 'always', 'sync_local'),
} as const;

/**
 * Apply theme to DOM
 */
function applyTheme(theme: Theme) {
	if (!browser) return;

	const root = document.documentElement;
	const isDark =
		theme === 'dark' ||
		(theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	root.classList.toggle('dark', isDark);

	// Update theme-color meta tag
	const metaThemeColor = document.querySelector('meta[name="theme-color"]');
	if (metaThemeColor) {
		metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#ffffff');
	}
}

/**
 * Apply font size to DOM
 */
function applyFontSize(size: FontSize) {
	if (!browser) return;

	const root = document.documentElement;

	// Remove old font size classes
	root.classList.remove(
		'font-size-xs',
		'font-size-small',
		'font-size-normal',
		'font-size-large',
		'font-size-xl',
	);

	// Add new font size class
	root.classList.add(`font-size-${size}`);

	// Also set CSS variables for Tailwind v4 compatibility
	const fontSizes = {
		xs: {
			'--text-xs': '0.625rem', // 10px
			'--text-sm': '0.75rem', // 12px
			'--text-base': '0.75rem', // 12px
			'--text-lg': '0.875rem', // 14px
			'--text-xl': '1rem', // 16px
			'--text-2xl': '1.125rem', // 18px
			'--text-3xl': '1.25rem', // 20px
			'--text-4xl': '1.5rem', // 24px
		},
		small: {
			'--text-xs': '0.6875rem', // 11px
			'--text-sm': '0.8125rem', // 13px
			'--text-base': '0.875rem', // 14px
			'--text-lg': '1rem', // 16px
			'--text-xl': '1.125rem', // 18px
			'--text-2xl': '1.375rem', // 22px
			'--text-3xl': '1.625rem', // 26px
			'--text-4xl': '2rem', // 32px
		},
		normal: {
			'--text-xs': '0.75rem', // 12px
			'--text-sm': '0.875rem', // 14px
			'--text-base': '1rem', // 16px
			'--text-lg': '1.125rem', // 18px
			'--text-xl': '1.25rem', // 20px
			'--text-2xl': '1.5rem', // 24px
			'--text-3xl': '1.875rem', // 30px
			'--text-4xl': '2.25rem', // 36px
		},
		large: {
			'--text-xs': '0.8125rem', // 13px
			'--text-sm': '0.9375rem', // 15px
			'--text-base': '1.125rem', // 18px
			'--text-lg': '1.25rem', // 20px
			'--text-xl': '1.5rem', // 24px
			'--text-2xl': '1.875rem', // 30px
			'--text-3xl': '2.25rem', // 36px
			'--text-4xl': '2.75rem', // 44px
		},
		xl: {
			'--text-xs': '0.875rem', // 14px
			'--text-sm': '1rem', // 16px
			'--text-base': '1.25rem', // 20px
			'--text-lg': '1.5rem', // 24px
			'--text-xl': '1.75rem', // 28px
			'--text-2xl': '2.125rem', // 34px
			'--text-3xl': '2.625rem', // 42px
			'--text-4xl': '3.25rem', // 52px
		},
	};

	// Apply the font size CSS variables
	const sizes = fontSizes[size];
	Object.entries(sizes).forEach(([key, value]) => {
		root.style.setProperty(key, value);
	});
}

/**
 * Apply font family to DOM
 */
function applyFontFamily(family: FontFamily) {
	if (!browser) return;

	const root = document.documentElement;

	// Remove old font family classes
	root.classList.remove('font-family-atkinson', 'font-family-opendyslexic', 'font-family-fast');

	// Add new font family class (default needs no class)
	if (family !== 'default') {
		root.classList.add(`font-family-${family}`);
	}
}

/**
 * Reactive state objects for easier access
 * These provide getters/setters that work with the Setting class
 */
// Track system theme preference for reactivity
let systemPrefersDark = $state(false);

// Initialize system theme listener
if (browser) {
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	systemPrefersDark = mediaQuery.matches;

	// Listen for system theme changes
	mediaQuery.addEventListener('change', (e) => {
		systemPrefersDark = e.matches;

		// Re-apply theme if using system theme
		if (settings.theme.currentValue === 'system') {
			applyTheme('system');
		}
	});
}

export const themeSettings = $state({
	get theme(): Theme {
		return settings.theme.currentValue;
	},
	set theme(value: Theme) {
		settings.theme.currentValue = value;
		applyTheme(value);
	},
	get isDark(): boolean {
		if (!browser) return false;
		const current = settings.theme.currentValue;
		return current === 'dark' || (current === 'system' && systemPrefersDark);
	},
});

export const languageSettings = $state({
	/** UI/interface language (for buttons, labels, etc.) */
	get ui(): SupportedLanguage {
		return settings.language.currentValue;
	},
	set ui(value: SupportedLanguage) {
		settings.language.currentValue = value;
	},
	/**
	 * Translation mode for content
	 * - 'default': Smart mode (source for country categories, browser lang for others)
	 * - 'source': Always show original language
	 * - 'custom': Use spokenLanguages list
	 * - Specific language code: Translate everything to that language
	 */
	get data(): SupportedLanguage {
		return settings.dataLanguage.currentValue;
	},
	set data(value: SupportedLanguage) {
		settings.dataLanguage.currentValue = value;
	},
	/**
	 * Languages the user can read/speak (only used when data mode is 'custom')
	 * First element is the main language for translations
	 * Other elements are additional languages user can read
	 */
	get contentLanguages(): SupportedLanguage[] {
		return settings.contentLanguages.currentValue;
	},
	set contentLanguages(value: SupportedLanguage[]) {
		settings.contentLanguages.currentValue = value;
		settings.contentLanguages.save();
		syncKnPrefsCookieFromSettings();
	},
	/**
	 * Get the language value to send to the API
	 * Returns a string for the lang parameter
	 * In custom mode, returns comma-separated list (e.g., 'en,es,fr')
	 * Otherwise returns single language code (e.g., 'en', 'default', 'source')
	 */
	getLanguageForAPI(): string {
		const dataSetting = settings.dataLanguage.currentValue;

		// If custom mode, send the preference list as comma-separated
		if (dataSetting === 'custom') {
			const preferences = settings.contentLanguages.currentValue;

			// Filter out special values
			const validPreferences = preferences.filter(
				(lang) => lang !== 'default' && lang !== 'source' && lang !== 'custom',
			);

			// If we have preferences, send them as a comma-separated string
			if (validPreferences.length > 0) {
				return validPreferences.join(',');
			}

			// Fallback to default if no valid preferences
			return 'default';
		}

		// Otherwise, send the setting directly
		return dataSetting;
	},
});

function syncKnPrefsCookieFromSettings(): void {
	if (!browser) return;
	// Lazy import avoids a runtime cycle: knPrefsCookie reads these settings
	// when it serializes the current first-render preferences.
	import('./knPrefsCookie').then(({ syncKnPrefsCookie }) => syncKnPrefsCookie());
}

// Stories per category: a whole number in the slider's 3-12 range
function clampStoryCount(value: number): number {
	if (!Number.isFinite(value)) return settings.storyCount.defaultValue;
	return Math.max(3, Math.min(12, Math.round(value)));
}

export const displaySettings = $state({
	get fontSize(): FontSize {
		return settings.fontSize.currentValue;
	},
	set fontSize(value: FontSize) {
		settings.fontSize.currentValue = value;
		applyFontSize(value);
		syncKnPrefsCookieFromSettings();
	},
	get fontFamily(): FontFamily {
		return settings.fontFamily.currentValue;
	},
	set fontFamily(value: FontFamily) {
		settings.fontFamily.currentValue = value;
		applyFontFamily(value);
	},
	get storyCount(): number {
		// Values loaded from storage or sync skip the setter, so clamp here too
		return clampStoryCount(settings.storyCount.currentValue);
	},
	set storyCount(value: number) {
		settings.storyCount.currentValue = clampStoryCount(value);
		syncKnPrefsCookieFromSettings();
	},
	get categoryHeaderPosition(): CategoryHeaderPosition {
		return settings.categoryHeaderPosition.currentValue;
	},
	set categoryHeaderPosition(value: CategoryHeaderPosition) {
		settings.categoryHeaderPosition.currentValue = value;
		syncKnPrefsCookieFromSettings();
	},
	get storyExpandMode(): StoryExpandMode {
		return settings.storyExpandMode.currentValue;
	},
	set storyExpandMode(value: StoryExpandMode) {
		settings.storyExpandMode.currentValue = value;
	},
	get storyOpenMode(): StoryOpenMode {
		return settings.storyOpenMode.currentValue;
	},
	set storyOpenMode(value: StoryOpenMode) {
		settings.storyOpenMode.currentValue = value;
	},
	get useLatestUrls(): boolean {
		return settings.useLatestUrls.currentValue;
	},
	set useLatestUrls(value: boolean) {
		settings.useLatestUrls.currentValue = value;
	},
	get mapsProvider(): MapsProvider {
		return settings.mapsProvider.currentValue;
	},
	set mapsProvider(value: MapsProvider) {
		settings.mapsProvider.currentValue = value;
	},
	get layoutWidth(): LayoutWidth {
		return settings.layoutWidth.currentValue;
	},
	set layoutWidth(value: LayoutWidth) {
		settings.layoutWidth.currentValue = value;
		syncKnPrefsCookieFromSettings();
	},
	get showIntro(): boolean {
		return !settings.introShown.currentValue;
	},
	set showIntro(value: boolean) {
		settings.introShown.currentValue = !value;
		syncKnPrefsCookieFromSettings();
	},
});

// Category settings are in their own module — re-export for backward compatibility
export { categorySettings } from './category-settings.svelte';

export const contentFilterSettings = $state({
	get current(): ContentFilter {
		return settings.contentFilter.currentValue;
	},
	set current(value: ContentFilter) {
		settings.contentFilter.currentValue = value;
	},
	set(value: ContentFilter) {
		this.current = value;
		settings.contentFilter.save();
	},
	init() {
		if (!browser) return;
		settings.contentFilter.load();
	},
});

export const readingLevelSettings = $state({
	/**
	 * Get the global reading level
	 */
	get global(): ReadingLevel {
		return settings.globalReadingLevel.currentValue;
	},
	/**
	 * Set the global reading level
	 */
	set global(value: ReadingLevel) {
		settings.globalReadingLevel.currentValue = value;
		settings.globalReadingLevel.save();
	},
	/**
	 * Get all category-specific reading levels (overrides only)
	 */
	get categoryOverrides(): Record<string, ReadingLevel> {
		return settings.categoryReadingLevels.currentValue;
	},
	/**
	 * Get the effective reading level for a specific category
	 * Returns category-specific level if set, otherwise global level
	 * Returns undefined only if both are 'normal' (no simplification needed)
	 */
	getForCategory(categoryId: string): ReadingLevel | undefined {
		const categoryLevel = settings.categoryReadingLevels.currentValue[categoryId];
		if (categoryLevel) {
			return categoryLevel === 'normal' ? undefined : categoryLevel;
		}
		const globalLevel = settings.globalReadingLevel.currentValue;
		return globalLevel === 'normal' ? undefined : globalLevel;
	},
	/**
	 * Get the raw category-specific level (without global fallback)
	 * Returns undefined if no category-specific override is set
	 */
	getCategoryOverride(categoryId: string): ReadingLevel | undefined {
		return settings.categoryReadingLevels.currentValue[categoryId];
	},
	/**
	 * Set the reading level for a specific category
	 * Pass undefined or 'use-global' to remove the override and use global setting
	 */
	setForCategory(categoryId: string, level: ReadingLevel | 'use-global' | undefined) {
		const current = { ...settings.categoryReadingLevels.currentValue };
		if (level === undefined || level === 'use-global') {
			// Remove the override - will use global setting
			delete current[categoryId];
		} else {
			current[categoryId] = level;
		}
		settings.categoryReadingLevels.currentValue = current;
		settings.categoryReadingLevels.save();
	},
	/**
	 * Clear all category-specific overrides
	 */
	clearAllOverrides() {
		settings.categoryReadingLevels.currentValue = {};
		settings.categoryReadingLevels.save();
	},
	/**
	 * Reset everything to defaults (global to normal, clear all overrides)
	 */
	resetAll() {
		settings.globalReadingLevel.currentValue = 'normal';
		settings.globalReadingLevel.save();
		settings.categoryReadingLevels.currentValue = {};
		settings.categoryReadingLevels.save();
	},
	/**
	 * Check if a category has a specific override set
	 */
	hasOverride(categoryId: string): boolean {
		return categoryId in settings.categoryReadingLevels.currentValue;
	},
	/**
	 * Get all categories that have specific overrides
	 */
	getCategoriesWithOverrides(): string[] {
		return Object.keys(settings.categoryReadingLevels.currentValue);
	},
	init() {
		if (!browser) return;
		settings.globalReadingLevel.load();
		settings.categoryReadingLevels.load();
	},
});

export const sectionSettings = $state({
	get all(): Record<string, boolean> {
		return settings.sections.currentValue;
	},
	set all(value: Record<string, boolean>) {
		settings.sections.currentValue = value;
	},
	isHidden(section: string): boolean {
		return !settings.sections.currentValue[section];
	},
	toggle(section: string) {
		const current = settings.sections.currentValue;
		settings.sections.currentValue = {
			...current,
			[section]: !current[section],
		};
		settings.sections.save();
	},
	init() {
		if (!browser) return;
		settings.sections.load();
	},
});

export const experimentalSettings = $state({
	get features(): Record<string, boolean> {
		return settings.experimental.currentValue;
	},
	set features(value: Record<string, boolean>) {
		settings.experimental.currentValue = value;
	},
	isEnabled(feature: string): boolean {
		return settings.experimental.currentValue[feature] || false;
	},
	toggle(feature: string) {
		const current = settings.experimental.currentValue;
		settings.experimental.currentValue = {
			...current,
			[feature]: !current[feature],
		};
		settings.experimental.save();
	},
	init() {
		if (!browser) return;
		settings.experimental.load();
	},
});

export const preloadingSettings = $state({
	get config(): Record<string, boolean> {
		return settings.preloadingConfig.currentValue;
	},
	set config(value: Record<string, boolean>) {
		settings.preloadingConfig.currentValue = value;
	},
	isEnabled(): boolean {
		return settings.preloadingConfig.currentValue.enablePreloading || false;
	},
	init() {
		if (!browser) return;
		settings.preloadingConfig.load();
	},
});

// Sync settings (not synced themselves)
export const syncSettings = $state({
	get settingsEnabled(): boolean {
		return settings.syncSettings.currentValue;
	},
	set settingsEnabled(value: boolean) {
		settings.syncSettings.currentValue = value;
	},
	get readHistoryEnabled(): boolean {
		return settings.syncReadHistory.currentValue;
	},
	set readHistoryEnabled(value: boolean) {
		settings.syncReadHistory.currentValue = value;
	},
});

// Settings lock state
export const settingsLock = $state({
	get isLocked(): boolean {
		return settings.settingsLockPin.currentValue !== '';
	},
	get hasPin(): boolean {
		return settings.settingsLockPin.currentValue !== '';
	},
	/** Hash a PIN using SHA-256 */
	async hashPin(pin: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(pin);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	},
	/** Verify a PIN against the stored hash */
	async verifyPin(pin: string): Promise<boolean> {
		const hash = await this.hashPin(pin);
		return hash === settings.settingsLockPin.currentValue;
	},
	/** Set a new PIN (stores the hash) */
	async setPin(pin: string) {
		const hash = await this.hashPin(pin);
		settings.settingsLockPin.currentValue = hash;
		settings.settingsLockPin.save();
	},
	/** Remove the PIN lock */
	removePin() {
		settings.settingsLockPin.currentValue = '';
		settings.settingsLockPin.save();
	},
	/** Managed mode helpers — only effective when PIN is set */
	get managed(): Record<string, boolean> {
		return settings.managedMode.currentValue;
	},
	/**
	 * Returns whether a managed-mode option is active. Only has effect when a
	 * PIN is set. `defaultValue` lets a specific option opt into "hidden by
	 * default once a PIN is set" semantics (pass `true`) — useful for
	 * features that should disappear from a simplified reading view unless
	 * the guardian explicitly re-enables them.
	 */
	getManagedOption(key: string, defaultValue: boolean = false): boolean {
		return this.hasPin && (settings.managedMode.currentValue[key] ?? defaultValue);
	},
	setManagedOption(key: string, value: boolean) {
		settings.managedMode.currentValue = {
			...settings.managedMode.currentValue,
			[key]: value,
		};
		settings.managedMode.save();
	},
	init() {
		if (!browser) return;
		settings.settingsLockPin.load();
		settings.managedMode.load();
	},
});

// Settings modal state (UI only, not persisted)
export const settingsModalState = $state({
	isOpen: false,
	activeTab: undefined as string | undefined,
});

/**
 * Helper functions for settings management
 */

// Load all settings from localStorage
export function loadAllSettings(context?: { isLoggedIn?: boolean }) {
	if (!browser) return;

	Object.values(settings).forEach((setting) => {
		setting.load(context);
	});

	// Run any pending migrations after settings are loaded
	runMigrations();

	// Apply theme, font size, and font family after loading
	applyTheme(settings.theme.currentValue);
	applyFontSize(settings.fontSize.currentValue);
	applyFontFamily(settings.fontFamily.currentValue);

	// Initialize settings lock
	settingsLock.init();

	// Listen for system theme changes
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	mediaQuery.addEventListener('change', () => {
		// Update app theme if set to system
		if (settings.theme.currentValue === 'system') {
			applyTheme('system');
		}
	});
}

/**
 * Seed structural settings from SSR cookie data before the first render.
 * These settings change the rendered DOM, so they must match on the server
 * and on the client's initial hydration pass. `loadAllSettings()` remains the
 * browser-side source of truth and will reconcile from localStorage on mount.
 */
export function seedSettingsFromSsrPrefs(prefs: KnPrefs | null | undefined): void {
	const display = prefs?.display;

	settings.fontSize.currentValue = display?.fontSize ?? settings.fontSize.defaultValue;
	settings.storyCount.currentValue = display?.storyCount ?? settings.storyCount.defaultValue;
	settings.layoutWidth.currentValue = display?.layoutWidth ?? settings.layoutWidth.defaultValue;
	settings.categoryHeaderPosition.currentValue =
		display?.categoryHeaderPosition ?? settings.categoryHeaderPosition.defaultValue;
	settings.introShown.currentValue = display?.introShown ?? settings.introShown.defaultValue;
	settings.singlePageMode.currentValue =
		display?.singlePageMode ?? settings.singlePageMode.defaultValue;
}

// Save all settings to localStorage
export function saveAllSettings() {
	if (!browser) return;

	Object.values(settings).forEach((setting) => {
		setting.save();
	});
}

// Cancel all pending changes
export function cancelAllSettings() {
	Object.values(settings).forEach((setting) => {
		setting.cancel();
	});
}

// Check if any settings have changes
export function hasChanges(): boolean {
	return Object.values(settings).some((setting) => setting.hasChanges());
}

// Check if settings in a specific category have changes
export function hasChangesByCategory(category: string): boolean {
	return Object.values(settings)
		.filter((setting) => setting.category === category)
		.some((setting) => setting.hasChanges());
}

// Reset all settings to defaults
export function resetToDefaults() {
	Object.values(settings).forEach((setting) => {
		setting.reset();
		setting.save();
	});
}
