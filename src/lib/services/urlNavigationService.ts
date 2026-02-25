import { SUPPORTED_LANGUAGES } from '$lib/constants/languages';
import type { SupportedLanguage } from '$lib/data/settings.svelte';
import { timeTravelBatch } from '$lib/stores/timeTravelBatch.svelte';
import { normalizeForUrl } from '$lib/utils/categoryIdTransform';
import {
	buildArticleUrl,
	buildCategoryUrl,
	parseUrl as parseEncodedUrl,
} from '$lib/utils/urlEncoder';

export interface NavigationParams {
	batchId?: string | null;
	batchDateSlug?: string | null; // Date slug (YYYY-MM-DD.N) for accurate URL generation
	categoryId?: string | null;
	storyIndex?: number | null;
	clusterId?: number | null; // For new URL format
	slug?: string | null; // For new URL format
	storyTitle?: string | null; // For generating slug from title
	isShared?: boolean;
	dataLang?: string | null; // Data language parameter
}

export interface ParsedUrl extends NavigationParams {
	isValid: boolean;
	isLegacyFormat?: boolean;
}

/**
 * Service to handle URL parsing and navigation logic
 */
// biome-ignore lint/complexity/noStaticOnlyClass: This class provides a clear namespace for URL navigation utilities
export class UrlNavigationService {
	/**
	 * Parse a URL to extract navigation parameters
	 * Supports both new encoded format and legacy formats
	 * Note: data_lang is ignored - language settings are stored in localStorage only
	 */
	static parseUrl(url: URL): ParsedUrl {
		const pathSegments = url.pathname.split('/').filter(Boolean);
		const params: ParsedUrl = { isValid: true };

		// Ignore data_lang from query parameters - language settings are in localStorage
		// If present in URL, it will be cleaned by cleanUrl()

		// Check if this is a shared link
		const sharedParam = url.searchParams.get('shared');
		if (sharedParam === '1') {
			params.isShared = true;
		}

		if (pathSegments.length === 0) {
			// Root path - valid but no params
			return params;
		}

		// Try parsing with new URL encoder first (handles both new and legacy formats)
		const encodedParams = parseEncodedUrl(url.pathname);
		if (encodedParams) {
			params.batchId = encodedParams.batchId;
			params.categoryId = encodedParams.categoryId;
			params.storyIndex = encodedParams.storyIndex;
			params.clusterId = encodedParams.clusterId;
			params.slug = encodedParams.slug;
			params.isLegacyFormat = encodedParams.isLegacyFormat;
			return params;
		}

		// Fall back to legacy parsing for other URL patterns

		// Check if first segment is "latest"
		const firstSegment = pathSegments[0];
		const secondSegment = pathSegments[1];

		if (firstSegment === 'latest') {
			// /latest/... URLs always use the latest batch
			params.batchId = null; // null means latest
			params.categoryId = pathSegments[1] ? decodeURIComponent(pathSegments[1]) : null;
			params.storyIndex = pathSegments[2] ? parseInt(pathSegments[2], 10) : null;
		} else if (secondSegment === 'latest') {
			// /category/latest URLs - simplified format for latest batch
			params.batchId = null; // null means latest
			params.categoryId = decodeURIComponent(firstSegment);
			params.storyIndex = null;
		} else {
			// Check if first segment looks like a batch ID
			const isBatchId = UrlNavigationService.isBatchId(firstSegment);

			if (!isBatchId) {
				// No batch ID, this is latest batch with category
				params.batchId = null;
				params.categoryId = decodeURIComponent(pathSegments[0]);
				params.storyIndex = pathSegments[1] ? parseInt(pathSegments[1], 10) : null;
			} else {
				// Has batch ID
				params.batchId = pathSegments[0];
				params.categoryId = pathSegments[1] ? decodeURIComponent(pathSegments[1]) : null;
				params.storyIndex = pathSegments[2] ? parseInt(pathSegments[2], 10) : null;
			}
		}

		// Validate story index if present
		if (params.storyIndex !== null && params.storyIndex !== undefined) {
			if (Number.isNaN(params.storyIndex) || params.storyIndex < 0) {
				params.isValid = false;
			}
		}

		return params;
	}

	/**
	 * Build a URL from navigation parameters
	 * Uses new encoded format when possible, falls back to legacy format
	 * Note: Language settings are stored in localStorage, not in URL
	 */
	static buildUrl(
		params: NavigationParams,
		_currentDataLang?: SupportedLanguage,
		useLatestPrefix: boolean = false,
		batchCreatedAt?: string | null,
	): string {
		const { batchId, categoryId, storyIndex, clusterId, storyTitle, batchDateSlug, isShared } =
			params;

		// Get batch metadata from store if not provided
		const batchData = timeTravelBatch.getBatchData();
		const effectiveBatchId = batchId || batchData.batchId;
		const effectiveBatchCreatedAt = batchCreatedAt || batchData.batchCreatedAt;
		const effectiveDateSlug = batchDateSlug || batchData.batchDateSlug;

		// Build new format URL if we have all required data
		// Prefer dateSlug over createdAt for accuracy (dateSlug includes batch sequence number)
		if (categoryId && effectiveDateSlug && clusterId && storyTitle) {
			// New format: /category/encoded-id/slug
			const url = buildArticleUrl(categoryId, effectiveDateSlug, clusterId, storyTitle);
			return isShared ? `${url}?shared=1` : url;
		}

		// Fallback to createdAt if dateSlug not available (backward compatibility)
		if (categoryId && effectiveBatchCreatedAt && clusterId && storyTitle) {
			// New format: /category/encoded-id/slug
			const url = buildArticleUrl(categoryId, effectiveBatchCreatedAt, clusterId, storyTitle);
			return isShared ? `${url}?shared=1` : url;
		}

		// For category-only URLs on latest batch, use simplified /category/latest format
		if (categoryId && !clusterId && useLatestPrefix) {
			const url = `/${encodeURIComponent(categoryId)}/latest`;
			return isShared ? `${url}?shared=1` : url;
		}

		// For historical batches with category but no story, use compact format
		if (categoryId && effectiveDateSlug && !clusterId && !useLatestPrefix) {
			// Category-only new format: /category/batch-code
			const url = buildCategoryUrl(categoryId, effectiveDateSlug);
			return isShared ? `${url}?shared=1` : url;
		}

		// For historical batches with no category and no story (single page mode), use dateSlug directly
		// Note: We use the raw dateSlug (YYYY-MM-DD.N) instead of encoding it because
		// the encoded format (YYYYMMDDN) is only supported in routes WITH a category prefix
		if (!categoryId && effectiveDateSlug && !clusterId && !useLatestPrefix) {
			// Single page mode historical: /YYYY-MM-DD.N
			const url = `/${effectiveDateSlug}`;
			return isShared ? `${url}?shared=1` : url;
		}

		// Fall back to legacy format
		let url = '/';

		if (useLatestPrefix) {
			// Use /latest prefix when requested (ignore batchId)
			url = '/latest';
		} else if (effectiveBatchId) {
			// Use specific batch ID for historical (UUID fallback)
			url = `/${effectiveBatchId}`;
		}

		if (categoryId) {
			url += `/${encodeURIComponent(categoryId)}`;
		}
		if (storyIndex !== null && storyIndex !== undefined) {
			url += `/${storyIndex}`;
		}

		// Add shared parameter if needed
		if (isShared) {
			url += '?shared=1';
		}

		// Language settings are stored in localStorage, not URL query params
		// This avoids conflicts with the new language settings system

		return url;
	}

	/**
	 * Check if a string looks like a batch ID (UUID or date slug)
	 */
	static isBatchId(str: string): boolean {
		// Date slug pattern (YYYY-MM-DD.N) or UUID pattern or legacy date pattern (YYYY-MM-DD)
		return (
			/^\d{4}-\d{2}-\d{2}\.\d+$/.test(str) || // Date slug: 2025-10-06.1
			/^\d{4}-\d{2}-\d{2}$/.test(str) || // Legacy date: 2025-10-06
			/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(str) // UUID
		);
	}

	/**
	 * Check if a string is a date slug (YYYY-MM-DD.N format)
	 */
	static isDateSlug(str: string): boolean {
		return /^\d{4}-\d{2}-\d{2}\.\d+$/.test(str);
	}

	/**
	 * Validate if a language code is supported
	 */
	static isValidDataLanguage(lang: string): boolean {
		return SUPPORTED_LANGUAGES.some((language) => language.code === lang);
	}

	/**
	 * Normalize category ID for comparison
	 */
	static normalizeCategoryId(categoryId: string): string {
		return normalizeForUrl(categoryId);
	}

	/**
	 * Compare two URLs to see if they're different (including query params)
	 */
	static areUrlsDifferent(url1: string, url2: string): boolean {
		return url1 !== url2;
	}

	/**
	 * Extract just the path from a URL (no query params)
	 */
	static getPathOnly(url: URL): string {
		return url.pathname;
	}

	/**
	 * Get the full URL including query params
	 */
	static getFullUrl(url: URL): string {
		return url.href;
	}

	/**
	 * Clean URL by removing data_lang parameter
	 * Language settings are stored in localStorage only
	 */
	static cleanUrl(url: URL): string {
		// Create a new URL object to avoid mutating the original
		const cleanedUrl = new URL(url);

		// Remove data_lang parameter if present
		if (cleanedUrl.searchParams.has('data_lang')) {
			cleanedUrl.searchParams.delete('data_lang');
		}

		return cleanedUrl.pathname + cleanedUrl.search + cleanedUrl.hash;
	}
}
