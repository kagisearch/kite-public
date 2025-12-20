import { browser } from '$app/environment';
import type { CategoryMetadata } from '$lib/services/categoryMetadataService';
import { categoryMetadataService } from '$lib/services/categoryMetadataService';

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
	 * Clear metadata (useful for testing)
	 */
	clear() {
		metadataState.metadata = [];
		metadataState.isLoaded = false;
	},
};
