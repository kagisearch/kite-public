import { browser } from '$app/environment';
import { categoryMetadataService } from '$lib/services/categoryMetadataService';
import type { CategoryMetadata } from '$lib/services/categoryMetadataService';

interface CategoryMetadataState {
	metadata: CategoryMetadata[];
	isLoaded: boolean;
}

// Initialize metadata state
const metadataState = $state<CategoryMetadataState>({
	metadata: [],
	isLoaded: false,
});

// Category metadata store API
export const categoryMetadataStore = {
	get metadata() {
		return metadataState.metadata;
	},

	get isLoaded() {
		return metadataState.isLoaded;
	},

	/**
	 * Find category metadata by category ID
	 */
	findById(categoryId: string): CategoryMetadata | undefined {
		return metadataState.metadata.find((meta) => meta.categoryId === categoryId.toLowerCase());
	},

	/**
	 * Initialize and load category metadata
	 * Should be called once at app initialization
	 */
	async init() {
		if (!browser) return;

		// Only load once
		if (metadataState.isLoaded) return;

		try {
			const metadata = await categoryMetadataService.loadMetadata();
			metadataState.metadata = metadata;
			metadataState.isLoaded = true;
		} catch (error) {
			console.error('Failed to load category metadata:', error);
			metadataState.metadata = [];
			metadataState.isLoaded = true; // Mark as loaded even on error to prevent retry loops
		}
	},

	/**
	 * Pre-populate the store with the SSR-shipped metadata catalogue. Lets
	 * `getCategoryDisplayName` resolve to localized names on both server and
	 * client first paint, instead of flashing the raw DB name until
	 * `init()`'s async fetch resolves.
	 *
	 * Sets `isLoaded = true` so `init()` short-circuits — ssrLoad.ts ships
	 * the full catalogue (`loadFullCategoryMetadata`), so the round-trip
	 * to /api/categories/metadata would just duplicate work and leave a
	 * narrow window where a transient empty store (e.g. a fetch failure
	 * setting `metadataState.metadata = []`) reverts every getDisplayName
	 * call to the raw slug. Eliminating that window kills the
	 * "Today in History → onthisday → Today in History" flicker the
	 * pre-load fix on its own couldn't close.
	 *
	 * Safe to call from server (no-op for state visibility on the next
	 * request — the merge keeps any previously-seeded data) and from the
	 * client before `init()` runs.
	 */
	seedFromSSR(seed: CategoryMetadata[] | null | undefined): void {
		if (!seed || seed.length === 0) return;
		// Merge by categoryId — preserve anything already loaded (in case
		// init() raced ahead) and add what's only in the seed.
		const byId = new Map<string, CategoryMetadata>();
		for (const meta of metadataState.metadata) {
			byId.set(meta.categoryId, meta);
		}
		for (const meta of seed) {
			if (!byId.has(meta.categoryId)) {
				byId.set(meta.categoryId, meta);
			}
		}
		metadataState.metadata = [...byId.values()];
		metadataState.isLoaded = true;
	},

	/**
	 * Clear metadata (useful for testing)
	 */
	clear() {
		metadataState.metadata = [];
		metadataState.isLoaded = false;
	},
};
