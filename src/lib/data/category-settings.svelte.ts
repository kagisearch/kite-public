/**
 * Category settings store.
 *
 * Manages enabled/disabled categories, display order, and temporary
 * category overlays. Reads directly from Setting.currentValue (which is
 * $state and reactive) — no duplicate state copy.
 */
import { browser } from '$app/environment';
import { syncKnPrefsCookie } from './knPrefsCookie';
import { type SinglePageMode, settings } from './settings.svelte';

export interface CategorySettingsCategory {
	id: string;
	name: string;
}

const DEFAULT_ENABLED = [
	'world',
	'usa',
	'business',
	'tech',
	'science',
	'sports',
	'gaming',
	'onthisday',
];

class CategorySettingsStore {
	// ── UI-only state (not persisted) ────────────────────────────────────
	private _allCategories = $state<CategorySettingsCategory[]>([]);
	private _temporaryCategory = $state<string | null>(null);

	// ── Getters — read directly from Setting.currentValue ────────────────

	get order(): string[] {
		return settings.categoryOrder.currentValue;
	}

	get enabled(): string[] {
		const persisted = settings.enabledCategories.currentValue;
		// Overlay: include temporary category without persisting it
		if (this._temporaryCategory && !persisted.includes(this._temporaryCategory)) {
			return [...persisted, this._temporaryCategory];
		}
		return persisted;
	}

	get disabled(): string[] {
		return settings.disabledCategories.currentValue;
	}

	get allCategories(): CategorySettingsCategory[] {
		return this._allCategories;
	}

	get all(): CategorySettingsCategory[] {
		return this._allCategories;
	}

	get temporaryCategory(): string | null {
		return this._temporaryCategory;
	}

	get singlePageMode(): SinglePageMode {
		return settings.singlePageMode.currentValue || 'disabled';
	}

	set singlePageMode(value: SinglePageMode) {
		settings.singlePageMode.currentValue = value;
		settings.singlePageMode.save();
		syncKnPrefsCookie();
	}

	// ── Mutation methods ─────────────────────────────────────────────────

	setAllCategories(newCategories: CategorySettingsCategory[]) {
		this._allCategories = newCategories;

		const allCategoryIds = newCategories.map((cat) => cat.id);
		const categorizedIds = new Set([...this.enabled, ...this.disabled]);
		const newCategoryIds = allCategoryIds.filter((cat) => !categorizedIds.has(cat));

		if (newCategoryIds.length > 0) {
			// Add new categories to disabled list by default
			settings.disabledCategories.currentValue = [...this.disabled, ...newCategoryIds];
			settings.disabledCategories.save();

			// Append truly-new categories to the existing order. Skip when the
			// order is empty (fresh-state visit) — initWithDefaults will then
			// seed it with DEFAULT_ENABLED + remaining, which is meaningful;
			// `[] + seed.categories` would persist the DB's arbitrary ordering
			// and visibly shuffle the nav on next init() (KNEWS-294).
			const newForOrder = allCategoryIds.filter((cat) => !this.order.includes(cat));
			if (newForOrder.length > 0 && this.order.length > 0) {
				settings.categoryOrder.currentValue = [...this.order, ...newForOrder];
				settings.categoryOrder.save();
			}
		}
	}

	setOrder(newOrder: string[]) {
		settings.categoryOrder.currentValue = newOrder;
		settings.categoryOrder.save();
		syncKnPrefsCookie();
	}

	setEnabled(newEnabled: string[]) {
		settings.enabledCategories.currentValue = newEnabled;
		const allCategoryIds = this._allCategories.map((cat) => cat.id);
		settings.disabledCategories.currentValue = allCategoryIds.filter(
			(cat) => !newEnabled.includes(cat),
		);
		settings.enabledCategories.save();
		settings.disabledCategories.save();
		syncKnPrefsCookie();
	}

	setDisabled(newDisabled: string[]) {
		// Remove disabled categories from the persisted enabled list
		const newEnabled = settings.enabledCategories.currentValue.filter(
			(cat) => !newDisabled.includes(cat),
		);
		const allCategoryIds = this._allCategories.map((cat) => cat.id);
		settings.enabledCategories.currentValue = newEnabled;
		settings.disabledCategories.currentValue = allCategoryIds.filter(
			(cat) => !newEnabled.includes(cat),
		);
		settings.enabledCategories.save();
		settings.disabledCategories.save();
		syncKnPrefsCookie();
	}

	cleanupDisabled(validDisabledCategories: string[]) {
		settings.disabledCategories.currentValue = validDisabledCategories;
		settings.disabledCategories.save();
	}

	enableCategory(category: string) {
		// Special case: make a temporary category permanent
		if (category === this._temporaryCategory) {
			this._temporaryCategory = null;
			// The category isn't in the persisted list yet — add it
			this.setEnabled([...settings.enabledCategories.currentValue, category]);
			return;
		}

		if (!settings.enabledCategories.currentValue.includes(category)) {
			this.setEnabled([...settings.enabledCategories.currentValue, category]);
		}
	}

	disableCategory(category: string) {
		// Guard: only act if the category is currently enabled.
		// Checks persisted list to avoid stale sync data issues. (KNEWS-219)
		if (settings.enabledCategories.currentValue.includes(category)) {
			const newDisabled = [...this.disabled.filter((c) => c !== category), category];
			this.setDisabled(newDisabled);
		}
	}

	isEnabled(category: string): boolean {
		return this.enabled.includes(category);
	}

	isDisabled(category: string): boolean {
		return this.disabled.includes(category);
	}

	// ── Temporary category (UI-only, not persisted) ──────────────────────

	addTemporary(categoryId: string) {
		this._temporaryCategory = categoryId;
		// The `get enabled()` getter automatically includes it via overlay
	}

	removeTemporary() {
		this._temporaryCategory = null;
		// The `get enabled()` getter automatically excludes it
	}

	clearTemporaryFlag() {
		this._temporaryCategory = null;
	}

	/**
	 * Server-only seed from the kn_prefs cookie's display-ordered enabled
	 * list. Populates the in-memory enabled state before SSR's first render
	 * so `orderedCategories` (which iterates `categorySettings.enabled`) can
	 * render the nav tabs in the user's preferred order. No-op in the browser
	 * — localStorage is the source of truth there, loaded by `init()`.
	 */
	seedFromSSR(enabled: string[]) {
		if (browser) return;
		settings.enabledCategories.currentValue = enabled;
	}

	// ── Lifecycle ────────────────────────────────────────────────────────

	init() {
		if (!browser) return;
		settings.categoryOrder.load();
		settings.enabledCategories.load();
		settings.disabledCategories.load();
		settings.singlePageMode.load();

		const dedupe = (arr: string[]) => [...new Set(arr)];
		const order = dedupe(settings.categoryOrder.currentValue);
		let enabled = dedupe(settings.enabledCategories.currentValue);
		let disabled = dedupe(settings.disabledCategories.currentValue);

		// Enforce mutual exclusivity — enabled wins. (KNEWS-219)
		const enabledIds = new Set(enabled);
		disabled = disabled.filter((cat) => !enabledIds.has(cat));

		// Reorder enabled to match categoryOrder (the authoritative order).
		// enabledCategories is a CRDT set that doesn't preserve array order.
		if (order.length > 0 && enabled.length > 0) {
			const orderSet = new Set(order);
			const orderedEnabled = order.filter((id) => enabledIds.has(id));
			const extraEnabled = enabled.filter((id) => !orderSet.has(id));
			enabled = [...orderedEnabled, ...extraEnabled];
		}

		const orderChanged =
			JSON.stringify(order) !== JSON.stringify(settings.categoryOrder.currentValue);
		const enabledChanged =
			JSON.stringify(enabled) !== JSON.stringify(settings.enabledCategories.currentValue);
		const disabledChanged =
			JSON.stringify(disabled) !== JSON.stringify(settings.disabledCategories.currentValue);

		// Save back only if anything changed (dedup, overlap removal, or reordering)
		if (orderChanged) {
			settings.categoryOrder.currentValue = order;
			settings.categoryOrder.save();
		}
		if (enabledChanged) {
			settings.enabledCategories.currentValue = enabled;
			settings.enabledCategories.save();
		}
		if (disabledChanged) {
			settings.disabledCategories.currentValue = disabled;
			settings.disabledCategories.save();
		}
		if (orderChanged || enabledChanged || disabledChanged) {
			syncKnPrefsCookie();
		}
	}

	initWithDefaults() {
		if (!browser || this._allCategories.length === 0) return;

		const allCategoryIds = this._allCategories.map((cat) => cat.id);
		let enabledChanged = false;
		let orderChanged = false;

		// If no enabled categories, set defaults
		if (settings.enabledCategories.currentValue.length === 0) {
			const enabledDefaults = DEFAULT_ENABLED.filter((id) => allCategoryIds.includes(id));
			settings.enabledCategories.currentValue = enabledDefaults;

			const disabledDefaults = allCategoryIds.filter((id) => !DEFAULT_ENABLED.includes(id));
			settings.disabledCategories.currentValue = disabledDefaults;

			enabledChanged = true;
		}

		// If no order, set default order
		if (settings.categoryOrder.currentValue.length === 0) {
			const orderedCategories = DEFAULT_ENABLED.filter((id) => allCategoryIds.includes(id));
			const remainingCategories = allCategoryIds.filter((id) => !DEFAULT_ENABLED.includes(id));
			settings.categoryOrder.currentValue = [...orderedCategories, ...remainingCategories];
			orderChanged = true;
		} else {
			// Add new categories to order
			const newCategories = allCategoryIds.filter(
				(cat) => !settings.categoryOrder.currentValue.includes(cat),
			);
			if (newCategories.length > 0) {
				settings.categoryOrder.currentValue = [
					...settings.categoryOrder.currentValue,
					...newCategories,
				];
				orderChanged = true;
			}
		}

		// Only save settings that were actually modified (KNEWS-219)
		if (orderChanged) {
			settings.categoryOrder.save();
		}
		if (enabledChanged) {
			settings.enabledCategories.save();
			settings.disabledCategories.save();
		}
		if (orderChanged || enabledChanged) {
			syncKnPrefsCookie();
		}
	}
}

export const categorySettings = new CategorySettingsStore();
