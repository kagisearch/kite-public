import type { KnExperimentalPrefs, ParsedKnContentFilterPrefs } from '$lib/data/knPrefs';
import type { CategoryMetadata } from '$lib/services/categoryMetadataService';
import type { Category, Story } from '$lib/types';

/**
 * Server-rendered initial data payload. Mirrors the shape consumed by
 * +page.svelte's seedStateFromSSR() and DataLoader's hydrateFromSeed().
 *
 * Produced by frontend/src/lib/server/ssrLoad.ts and used by every route
 * with a +page.server.ts that ships the news shell. Anonymous users hit
 * GCP CDN for the rendered HTML; logged-in users get fresh per-request SSR.
 */
export interface SeedData {
	batchId: string;
	dateSlug?: string;
	batchCreatedAt?: string;
	categories: Category[];
	categoryMap: Record<string, string>;
	allCategoryStories: Record<string, Story[]>;
	timestamp: number;
	hasOnThisDay: boolean;
	chaosIndex?: number;
	chaosDescription?: string;
	chaosLastUpdated?: string;
	totalReadCount: number;
	isLatestBatch: boolean;
	/**
	 * Server's resolved current category for first paint. Equal to the URL-
	 * pinned category (e.g. /italy/latest) when present, otherwise the first
	 * non-OnThisDay entry from `enabled` (cookie's display-ordered list), or
	 * the first DEFAULT_ENABLED_CATEGORIES entry as ultimate fallback. May
	 * legitimately have zero stories — the page renders the empty-state for
	 * that category instead of silently substituting a different one.
	 */
	preferredCategory: string;
	/**
	 * User's enabled categories in display order, sourced from the kn_prefs
	 * cookie. Used by handleDataLoaded on initial mount to populate
	 * categorySettings.enabled before SSR's first render so the nav tabs match
	 * the user's actual preferences without a hydration flash. Undefined for
	 * cookieless requests; the client's localStorage init takes over instead.
	 */
	enabled?: string[];
	/**
	 * SSR mirror of the content filter settings needed by StoryList. When
	 * omitted, the server resets the content filter store to defaults for the
	 * request to avoid cross-request leakage from module-level state.
	 */
	contentFilter?: ParsedKnContentFilterPrefs;
	/**
	 * Cluster IDs the logged-in user has already read, scoped to the stories
	 * actually rendered in the initial category (not the full read history).
	 * Lets the SSR HTML apply the "read" styling on first paint instead of
	 * flashing every story as unread until the client Dexie sync completes.
	 * Anonymous users get undefined and fall back to the existing
	 * Dexie/localStorage hydration path.
	 */
	readStories?: Record<string, true>;
	/**
	 * Experimental feature flags whose value gates SSR-visible elements
	 * (currently the World Tension / chaos index badge in the header).
	 * Mirrored from `kite-experimental-features` localStorage via the
	 * kn_prefs cookie so the SSR shell matches the post-hydration state.
	 */
	experimental?: KnExperimentalPrefs;
	/**
	 * Category metadata for the categories shown in the SSR nav (typically
	 * just the user's enabled list). Lets `getDisplayName` resolve community
	 * categories' localized names on the server too — without this the SSR
	 * HTML falls back to the raw DB name and hydration visibly re-labels
	 * each tab (e.g. `onthisday` → "Today in History"). Sourced from the
	 * same `categoryMetadataLoader` the `/api/categories/metadata` endpoint
	 * uses, so the data matches what the client would have fetched anyway.
	 */
	categoryMetadata?: CategoryMetadata[];
}
