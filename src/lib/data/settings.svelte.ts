import { browser } from '$app/environment';
import { Setting } from './setting.svelte';

// Type for supported languages
export type SupportedLanguage =
	| 'default'
	| 'source'
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
	| 'tr';

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
	dataLanguage: new Setting<SupportedLanguage>(
		'dataLanguage',
		'default',
		'when_not_default',
		'language',
	),

	// Display Settings
	fontSize: new Setting<FontSize>('fontSize', 'normal', 'when_not_default', 'display'),
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

	// Category Settings
	categoryOrder: new Setting<string[]>('categoryOrder', [], 'always', 'categories'),
	enabledCategories: new Setting<string[]>('enabledCategories', [], 'always', 'categories'),
	disabledCategories: new Setting<string[]>('disabledCategories', [], 'always', 'categories'),

	// Content Settings
	contentFilter: new Setting<ContentFilter>(
		'contentFilter',
		'default',
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

	// UI State (not synced)
	introShown: new Setting<boolean>('introShown', false, 'when_true', 'ui_state'),

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

	// Update favicon based on browser's theme preference (not app theme)
	const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
	if (favicon) {
		const browserPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		favicon.href = browserPrefersDark ? '/svg/kagi_news_icon_dark.svg' : '/svg/kagi_news_icon.svg';
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

		// Always update favicon based on system preference (regardless of app theme)
		const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
		if (favicon) {
			favicon.href = e.matches ? '/svg/kagi_news_icon_dark.svg' : '/svg/kagi_news_icon.svg';
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
	get ui(): SupportedLanguage {
		return settings.language.currentValue;
	},
	set ui(value: SupportedLanguage) {
		settings.language.currentValue = value;
	},
	get data(): SupportedLanguage {
		return settings.dataLanguage.currentValue;
	},
	set data(value: SupportedLanguage) {
		settings.dataLanguage.currentValue = value;
	},
});

export const displaySettings = $state({
	get fontSize(): FontSize {
		return settings.fontSize.currentValue;
	},
	set fontSize(value: FontSize) {
		settings.fontSize.currentValue = value;
		applyFontSize(value);
	},
	get storyCount(): number {
		return settings.storyCount.currentValue;
	},
	set storyCount(value: number) {
		settings.storyCount.currentValue = Math.max(3, Math.min(12, value));
	},
	get categoryHeaderPosition(): CategoryHeaderPosition {
		return settings.categoryHeaderPosition.currentValue;
	},
	set categoryHeaderPosition(value: CategoryHeaderPosition) {
		settings.categoryHeaderPosition.currentValue = value;
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
	get showIntro(): boolean {
		return !settings.introShown.currentValue;
	},
	set showIntro(value: boolean) {
		settings.introShown.currentValue = !value;
	},
});

// Categories need special handling due to complex logic
export interface Category {
	id: string;
	name: string;
}

const categoriesState = $state({
	allCategories: [] as Category[],
	temporaryCategory: null as string | null,
	// Direct state for category settings
	order: settings.categoryOrder.currentValue,
	enabled: settings.enabledCategories.currentValue,
	disabled: settings.disabledCategories.currentValue,
});

// Make categorySettings reactive by wrapping in $state
export const categorySettings = $state({
	// Direct access to state properties
	get order() {
		return categoriesState.order;
	},
	get enabled() {
		return categoriesState.enabled;
	},
	get disabled() {
		return categoriesState.disabled;
	},
	get allCategories() {
		return categoriesState.allCategories;
	},
	get all() {
		return categoriesState.allCategories;
	}, // Alias
	get temporaryCategory() {
		return categoriesState.temporaryCategory;
	},

	setAllCategories(newCategories: Category[]) {
		categoriesState.allCategories = newCategories;
	},
	setOrder(newOrder: string[]) {
		categoriesState.order = newOrder;
		settings.categoryOrder.currentValue = newOrder;
		settings.categoryOrder.save();
		settings.enabledCategories.save();
	},
	setEnabled(newEnabled: string[]) {
		console.log('[CategorySettings] setEnabled called with:', newEnabled);
		categoriesState.enabled = newEnabled;
		settings.enabledCategories.currentValue = newEnabled;
		// Update disabled to be all categories not in enabled
		const allCategoryIds = categoriesState.allCategories.map((cat) => cat.id);
		categoriesState.disabled = allCategoryIds.filter((cat) => !newEnabled.includes(cat));
		settings.disabledCategories.currentValue = categoriesState.disabled;
		settings.enabledCategories.save();
		settings.disabledCategories.save();
		console.log(
			'[CategorySettings] After setEnabled, categoriesState.enabled:',
			categoriesState.enabled,
		);
	},
	setDisabled(newDisabled: string[]) {
		// Remove disabled categories from enabled
		categoriesState.enabled = categoriesState.enabled.filter((cat) => !newDisabled.includes(cat));
		// Disable all categories not found in enabled
		const allCategoryIds = categoriesState.allCategories.map((cat) => cat.id);
		categoriesState.disabled = allCategoryIds.filter((cat) => !categoriesState.enabled.includes(cat));

		settings.enabledCategories.currentValue = categoriesState.enabled;
		settings.disabledCategories.currentValue = categoriesState.disabled;
		settings.enabledCategories.save();
		settings.disabledCategories.save();
	},
	enableCategory(category: string) {
		if (!this.enabled.includes(category)) {
			const newEnabled = [...this.enabled, category];
			this.setEnabled(newEnabled);
		}
	},
	disableCategory(category: string) {
		if (!this.disabled.includes(category)) {
			const newDisabled = [...this.disabled, category];
			this.setDisabled(newDisabled);
		}
	},
	isEnabled(category: string): boolean {
		return this.enabled.includes(category);
	},
	isDisabled(category: string): boolean {
		return this.disabled.includes(category);
	},
	addTemporary(categoryId: string) {
		categoriesState.temporaryCategory = categoryId;
		if (!this.enabled.includes(categoryId)) {
			const newEnabled = [...this.enabled, categoryId];
			settings.enabledCategories.currentValue = newEnabled;
			// Don't save - this is temporary
		}
	},
	removeTemporary() {
		if (categoriesState.temporaryCategory) {
			settings.enabledCategories.currentValue = this.enabled.filter(
				(cat) => cat !== categoriesState.temporaryCategory,
			);
			categoriesState.temporaryCategory = null;
			// Don't save - just restoring to saved state
		}
	},
	// Load from localStorage and update reactive state
	init() {
		if (!browser) return;
		settings.categoryOrder.load();
		settings.enabledCategories.load();
		settings.disabledCategories.load();

		// Update the reactive state after loading
		categoriesState.order = settings.categoryOrder.currentValue;
		categoriesState.enabled = settings.enabledCategories.currentValue;
		categoriesState.disabled = settings.disabledCategories.currentValue;
	},
	// Reload from localStorage (called after sync updates)
	reload() {
		// Just call init - it does the same thing
		this.init();
	},
	initWithDefaults() {
		if (!browser || categoriesState.allCategories.length === 0) return;

		const allCategoryIds = categoriesState.allCategories.map((cat) => cat.id);

		// Default enabled categories for first-time setup
		const defaultEnabledCategories = [
			'world',
			'usa',
			'business',
			'tech',
			'science',
			'sports',
			'gaming',
			'onthisday',
		];

		// If no enabled categories, set defaults
		if (this.enabled.length === 0) {
			// Set enabled categories to defaults (that exist in current batch)
			const enabledDefaults = defaultEnabledCategories.filter((categoryId) =>
				allCategoryIds.includes(categoryId),
			);
			settings.enabledCategories.currentValue = enabledDefaults;
			categoriesState.enabled = enabledDefaults; // Update the reactive state too!

			// Set disabled categories to all others
			const disabledDefaults = allCategoryIds.filter(
				(categoryId) => !defaultEnabledCategories.includes(categoryId),
			);
			settings.disabledCategories.currentValue = disabledDefaults;
			categoriesState.disabled = disabledDefaults; // Update the reactive state too!
		}

		// If no order, set default order
		if (this.order.length === 0) {
			const orderedCategories = defaultEnabledCategories.filter((categoryId) =>
				allCategoryIds.includes(categoryId),
			);
			const remainingCategories = allCategoryIds.filter(
				(categoryId) => !defaultEnabledCategories.includes(categoryId),
			);
			const defaultOrder = [...orderedCategories, ...remainingCategories];
			settings.categoryOrder.currentValue = defaultOrder;
			categoriesState.order = defaultOrder; // Update the reactive state too!
		} else {
			// Add new categories to order
			const newCategories = allCategoryIds.filter((cat) => !this.order.includes(cat));
			if (newCategories.length > 0) {
				const newOrder = [...this.order, ...newCategories];
				settings.categoryOrder.currentValue = newOrder;
				categoriesState.order = newOrder; // Update the reactive state too!
			}
		}

		// Save all category settings
		settings.categoryOrder.save();
		settings.enabledCategories.save();
		settings.disabledCategories.save();
	},
});

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

	// Apply theme and font size after loading
	applyTheme(settings.theme.currentValue);
	applyFontSize(settings.fontSize.currentValue);

	// Listen for system theme changes
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	mediaQuery.addEventListener('change', () => {
		// Update app theme if set to system
		if (settings.theme.currentValue === 'system') {
			applyTheme('system');
		}

		// Always update favicon based on browser preference
		const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
		if (favicon) {
			favicon.href = mediaQuery.matches
				? '/svg/kagi_news_icon_dark.svg'
				: '/svg/kagi_news_icon.svg';
		}
	});
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
