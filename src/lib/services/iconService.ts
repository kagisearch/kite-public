/**
 * Centralized icon service for managing Iconify icon loading and caching
 */

export interface IconData {
	body: string;
	left: number;
	top: number;
	width: number;
	height: number;
}

class IconService {
	private cache = new Map<string, IconData>();
	private pendingRequests = new Map<string, Promise<IconData | null>>();
	private preloadQueue = new Set<string>();
	private isPreloading = false;
	private missingIcons = new Set<string>();
	private checkedIcons = new Set<string>();
	// Persistent cache keys and limits (client-only)
	private static PERSIST_INDEX_KEY = '__ICON_CACHE_V1_INDEX__';
	private static PERSIST_PREFIX = '__ICON_CACHE_V1__:';
	private static PERSIST_MAX_ENTRIES = 400;

	constructor() {
		// Load any persisted icons from previous sessions first
		this.loadPersistentCache();
		// Immediately load critical icons synchronously
		this.preloadCriticalIconsSync();
	}

	/**
	 * Load icon data from localStorage into in-memory cache (client-only)
	 */
	private loadPersistentCache(): void {
		if (typeof window === 'undefined') return;
		try {
			const indexRaw = window.localStorage.getItem(IconService.PERSIST_INDEX_KEY);
			if (!indexRaw) return;
			const keys: string[] = JSON.parse(indexRaw);
			// Limit the number of items loaded at startup to keep it fast
			const toLoad = keys.slice(-Math.min(keys.length, 200));
			for (const key of toLoad) {
				const raw = window.localStorage.getItem(IconService.PERSIST_PREFIX + key);
				if (!raw) continue;
				try {
					const data: IconData = JSON.parse(raw);
					// Basic shape validation
					if (data && typeof data.body === 'string') {
						this.cache.set(key, data);
					}
				} catch {
					// Ignore corrupted entries
				}
			}
		} catch {
			// Ignore persistence failures
		}
	}

	/**
	 * Persist icon data to localStorage with an insertion-order index (client-only)
	 */
	private persistIcon(iconName: string, data: IconData): void {
		if (typeof window === 'undefined') return;
		// Write asynchronously to avoid blocking rendering
		setTimeout(() => {
			try {
				const indexKey = IconService.PERSIST_INDEX_KEY;
				const itemKey = IconService.PERSIST_PREFIX + iconName;
				const indexRaw = window.localStorage.getItem(indexKey);
				let index: string[] = [];
				if (indexRaw) {
					try { index = JSON.parse(indexRaw); } catch { index = []; }
				}
				// Move key to the end (most recent)
				index = index.filter(k => k !== iconName);
				index.push(iconName);
				// Trim if exceeding max entries
				while (index.length > IconService.PERSIST_MAX_ENTRIES) {
					const evict = index.shift();
					if (evict) {
						try { window.localStorage.removeItem(IconService.PERSIST_PREFIX + evict); } catch {}
					}
				}
				// Save payload and index
				window.localStorage.setItem(itemKey, JSON.stringify(data));
				window.localStorage.setItem(indexKey, JSON.stringify(index));
			} catch {
				// Ignore persistence failures silently
			}
		}, 0);
	}

	/**
	 * Get icon data, either from cache or by fetching
	 */
	async getIcon(iconName: string): Promise<IconData | null> {
		// Return cached data immediately
		if (this.cache.has(iconName)) {
			return this.cache.get(iconName)!;
		}

		// Return existing pending request to avoid duplicates
		if (this.pendingRequests.has(iconName)) {
			return this.pendingRequests.get(iconName)!;
		}

		// Create new request
		const request = this.fetchIcon(iconName);
		this.pendingRequests.set(iconName, request);

		try {
			const result = await request;
			return result;
		} finally {
			this.pendingRequests.delete(iconName);
		}
	}

	/**
	 * Get multiple icons at once, returning cached ones immediately
	 */
	async getIcons(iconNames: string[]): Promise<Map<string, IconData | null>> {
		const results = new Map<string, IconData | null>();
		const toFetch: string[] = [];

		// Separate cached from non-cached icons
		iconNames.forEach(iconName => {
			if (this.cache.has(iconName)) {
				results.set(iconName, this.cache.get(iconName)!);
			} else {
				toFetch.push(iconName);
			}
		});

		// Fetch remaining icons
		if (toFetch.length > 0) {
			const fetchPromises = toFetch.map(iconName =>
				this.getIcon(iconName).then(data => ({ iconName, data }))
			);

			const fetchResults = await Promise.allSettled(fetchPromises);
			fetchResults.forEach(result => {
				if (result.status === 'fulfilled') {
					results.set(result.value.iconName, result.value.data);
				}
			});
		}

		return results;
	}

	/**
	 * Fetch icon data from Iconify API
	 */
	private async fetchIcon(iconName: string): Promise<IconData | null> {
		const parts = iconName.split(':');
		if (parts.length !== 2) {
			if (import.meta.env.DEV) {
				console.warn(`Invalid icon name format: ${iconName}`);
			}
			return null;
		}

		const [prefix, name] = parts;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const response = await fetch(
				`https://api.iconify.design/${prefix}.json?icons=${name}`,
				{ signal: controller.signal }
			);

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (!data?.icons?.[name]) {
				this.missingIcons.add(iconName);
				this.checkedIcons.add(iconName);
				if (import.meta.env.DEV) {
					console.warn(`Icon not found in API response: ${iconName}`);
				}
				return null;
			}

			this.checkedIcons.add(iconName);

			const iconProps = data.icons[name];
			const iconData: IconData = {
				body: iconProps.body,
				left: iconProps.left ?? data.left ?? 0,
				top: iconProps.top ?? data.top ?? 0,
				width: iconProps.width ?? data.width ?? 16,
				height: iconProps.height ?? data.height ?? 16
			};

			// Cache the result
			this.cache.set(iconName, iconData);
			// Persist for future sessions
			this.persistIcon(iconName, iconData);
			return iconData;

		} catch (error) {
			if (import.meta.env.DEV) {
				if (error instanceof Error && error.name === 'AbortError') {
					console.warn(`Icon fetch timeout: ${iconName}`);
				} else {
					console.warn(`Failed to fetch icon: ${iconName}`, error);
				}
			}
			return null;
		}
	}

	/**
	 * Validate icon name format
	 */
	private isValidIconName(iconName: string): boolean {
		const parts = iconName.split(':');
		if (parts.length !== 2) return false;

		const [prefix, name] = parts;
		// Basic validation - prefix and name should contain valid characters
		return /^[a-z0-9-]+$/.test(prefix) && /^[a-z0-9-_]+$/.test(name);
	}

	/**
	 * Add icons to preload queue
	 */
	preload(iconNames: string[], highPriority: boolean = false): void {
		// Filter out invalid icon names and already cached icons
		const validNewIcons = iconNames.filter(name =>
			this.isValidIconName(name) && !this.cache.has(name)
		);

		if (validNewIcons.length > 0) {
			// Only log for large batches or high priority
			if (import.meta.env.DEV && (validNewIcons.length > 10 || highPriority)) {
				console.log(`🎨 Preloading ${validNewIcons.length} icons${highPriority ? ' (high priority)' : ''}`);
			}

			if (highPriority) {
				// For high priority, start immediate preload
				this.preloadImmediate(validNewIcons).catch(error => {
					if (import.meta.env.DEV) {
						console.warn('High priority preload failed:', error);
					}
				});
			} else {
				validNewIcons.forEach(name => this.preloadQueue.add(name));
				this.processPreloadQueue();
			}
		}
	}

	/**
	 * Process the preload queue in batches
	 */
	private async processPreloadQueue(): Promise<void> {
		if (this.isPreloading || this.preloadQueue.size === 0) {
			return;
		}

		this.isPreloading = true;

		// Process in larger batches for better performance
		const batch = Array.from(this.preloadQueue).slice(0, 25);
		batch.forEach(iconName => this.preloadQueue.delete(iconName));

		// Group icons by prefix to make batch API calls
		const iconsByPrefix = new Map<string, string[]>();
		batch.forEach(iconName => {
			const [prefix, name] = iconName.split(':');
			if (prefix && name) {
				if (!iconsByPrefix.has(prefix)) {
					iconsByPrefix.set(prefix, []);
				}
				iconsByPrefix.get(prefix)!.push(name);
			}
		});

		// Fetch icons by prefix in batch requests
		const promises = Array.from(iconsByPrefix.entries()).map(([prefix, names]) =>
			this.fetchIconBatch(prefix, names)
		);

		await Promise.allSettled(promises);

		this.isPreloading = false;

		// Process next batch if there are more items
		if (this.preloadQueue.size > 0) {
			// Immediate processing for faster loading
			setTimeout(() => this.processPreloadQueue(), 10);
		}
	}

	/**
	 * Fetch multiple icons from the same prefix in a single API call
	 */
	private async fetchIconBatch(prefix: string, names: string[]): Promise<void> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced to 3s

			const response = await fetch(
				`https://api.iconify.design/${prefix}.json?icons=${names.join(',')}`,
				{ signal: controller.signal }
			);

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Track found and missing icons
			const foundIcons: string[] = [];
			const missingIcons: string[] = [];

			// Process each icon in the batch
			names.forEach(name => {
				const iconName = `${prefix}:${name}`;
				this.checkedIcons.add(iconName);

				if (data?.icons?.[name]) {
					const iconProps = data.icons[name];
					const iconData: IconData = {
						body: iconProps.body,
						left: iconProps.left ?? data.left ?? 0,
						top: iconProps.top ?? data.top ?? 0,
						width: iconProps.width ?? data.width ?? 16,
						height: iconProps.height ?? data.height ?? 16
					};

					// Cache the result
					this.cache.set(iconName, iconData);
					// Persist for future sessions
					this.persistIcon(iconName, iconData);
					foundIcons.push(iconName);
				} else {
					this.missingIcons.add(iconName);
					missingIcons.push(iconName);
				}
			});

			// Only log if we have a significant number of missing icons or if debugging
			if (import.meta.env.DEV && missingIcons.length > 0 && (missingIcons.length > 3 || foundIcons.length === 0)) {
				console.warn(`${missingIcons.length} icons not found in ${prefix}: ${missingIcons.slice(0, 5).join(', ')}${missingIcons.length > 5 ? '...' : ''}`);
			}

		} catch (error) {
			if (import.meta.env.DEV) {
				if (error instanceof Error && error.name === 'AbortError') {
					console.warn(`Icon batch fetch timeout: ${prefix}:${names.join(',')}`);
				} else {
					console.warn(`Failed to fetch icon batch: ${prefix}:${names.join(',')}`, error);
				}
			}
		}
	}

	/**
	 * Check if icon is cached
	 */
	isCached(iconName: string): boolean {
		return this.cache.has(iconName);
	}

	/**
	 * Get cached icon data synchronously (returns null if not cached)
	 */
	getCachedIcon(iconName: string): IconData | null {
		return this.cache.get(iconName) || null;
	}

	/**
	 * Check if an icon exists in the API (with caching)
	 */
	private iconExistsCache = new Map<string, boolean>();

	async checkIconExists(iconName: string): Promise<boolean> {
		// Return cached result if available
		if (this.iconExistsCache.has(iconName)) {
			return this.iconExistsCache.get(iconName)!;
		}

		// If already in main cache, it exists
		if (this.cache.has(iconName)) {
			this.iconExistsCache.set(iconName, true);
			return true;
		}

		const parts = iconName.split(':');
		if (parts.length !== 2) {
			this.iconExistsCache.set(iconName, false);
			return false;
		}

		const [prefix, name] = parts;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 2000);

			const response = await fetch(
				`https://api.iconify.design/${prefix}.json?icons=${name}`,
				{ signal: controller.signal }
			);

			clearTimeout(timeoutId);

			if (!response.ok) {
				this.iconExistsCache.set(iconName, false);
				return false;
			}

			const data = await response.json();
			const exists = !!(data?.icons?.[name]);

			this.iconExistsCache.set(iconName, exists);
			return exists;

		} catch (error) {
			this.iconExistsCache.set(iconName, false);
			return false;
		}
	}

	/**
	 * Preload icons immediately and return a promise that resolves when all are loaded
	 */
	async preloadImmediate(iconNames: string[]): Promise<void> {
		const uncachedIcons = iconNames.filter(name => !this.cache.has(name));
		if (uncachedIcons.length === 0) return;

		// Only log for significant preloads
		if (import.meta.env.DEV && uncachedIcons.length > 5) {
			console.log(`🚀 Immediate preload of ${uncachedIcons.length} icons`);
		}

		// Group by prefix for batch loading
		const iconsByPrefix = new Map<string, string[]>();
		uncachedIcons.forEach(iconName => {
			const [prefix, name] = iconName.split(':');
			if (prefix && name) {
				if (!iconsByPrefix.has(prefix)) {
					iconsByPrefix.set(prefix, []);
				}
				iconsByPrefix.get(prefix)!.push(name);
			}
		});

		// Fetch all prefixes concurrently with short timeout
		const promises = Array.from(iconsByPrefix.entries()).map(([prefix, names]) =>
			Promise.race([
				this.fetchIconBatch(prefix, names),
				new Promise(resolve => setTimeout(() => resolve(null), 1000)) // 1s timeout
			])
		);

		await Promise.allSettled(promises);
	}

	/**
	 * Synchronously preload critical icons using embedded SVG data
	 * This bypasses network requests entirely for the most critical icons
	 */
	preloadCriticalIconsSync(): void {
		// Embed the most critical icon SVG data directly to avoid network requests
		const criticalIconData: Record<string, IconData> = {
			'heroicons-outline:globe-alt': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9zm0 0c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3s4.5 4.03 4.5 9-2.015 9-4.5 9zm-9-9a9 9 0 1118 0 9 9 0 01-18 0z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'mdi:newspaper': {
				body: '<path d="M4 6h16v2H4V6m0 5h16v2H4v-2m0 5h16v2H4v-2M2 4h20v16H2V4m2 2v12h16V6H4Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:question-mark-circle': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c0-1.037.843-1.879 1.879-1.879s1.879.842 1.879 1.879c0 .654-.313 1.234-.8 1.6-.434.328-.8.775-.8 1.281v.719m0 3.6h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:home': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:newspaper': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:star': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:check-circle': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'tabler:map-pin': {
				body: '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />',
				left: 0, top: 0, width: 24, height: 24
			},
			'tabler:user': {
				body: '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />',
				left: 0, top: 0, width: 24, height: 24
			},
			'tabler:building': {
				body: '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l18 0" /><path d="M9 8l1 0" /><path d="M9 12l1 0" /><path d="M9 16l1 0" /><path d="M14 8l1 0" /><path d="M14 12l1 0" /><path d="M14 16l1 0" /><path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />',
				left: 0, top: 0, width: 24, height: 24
			},
			'tabler:tag': {
				body: '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z" />',
				left: 0, top: 0, width: 24, height: 24
			},
			'tabler:external-link': {
				body: '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" /><path d="M11 13l9 -9" /><path d="M15 4h5v5" />',
				left: 0, top: 0, width: 24, height: 24
			},
			// Common emoji-to-icon mappings (most frequently used)
			'heroicons-outline:sun': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:cloud': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:currency-dollar': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:briefcase': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:building-office': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15l-.75 18h-13.5L4.5 3zM9 9h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:tv': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:musical-note': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:trophy': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.544.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:heart': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'heroicons-outline:academic-cap': {
				body: '<path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			// Additional common material-symbols icons
			'material-symbols:rainy': {
				body: '<path d="M6 16q-.825 0-1.413-.588T4 14q0-.825.588-1.413T6 12h12q.825 0 1.413.588T20 14q0 .825-.588 1.413T18 16H6Zm0-4q-.825 0-1.413-.588T4 10q0-.825.588-1.413T6 8h12q.825 0 1.413.588T20 10q0 .825-.588 1.413T18 12H6Zm2 8v-2h2v2H8Zm4 0v-2h2v2h-2Zm4 0v-2h2v2h-2Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'material-symbols:partly-cloudy-day': {
				body: '<path d="M6.5 20q-2.275 0-3.888-1.613T1 14.5q0-1.775 1.062-3.188T4.75 9.775q.425-2.65 2.313-4.213T11.5 4q2.925 0 4.963 2.038T18.5 11q1.725.2 2.863 1.488T22.5 15.5q0 1.875-1.313 3.188T17.5 20h-11Zm0-2h11q1.05 0 1.775-.725T20 15.5q0-1.05-.725-1.775T17.5 13H16v-2q0-2.075-1.463-3.538T11.5 6q-1.825 0-3.188 1.175T6.85 10.1l-.175.9H6.5q-1.45 0-2.475 1.025T3 14.5q0 1.45 1.025 2.475T6.5 18Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'material-symbols:directions-car': {
				body: '<path d="M5 19v-2h1.5v-7.5L8 6h8l1.5 3.5V17H19v2h-2v-1H7v1H5Zm3.5-9h7l-.75-1.5h-5.5L8.5 10Zm-1 5.5q.625 0 1.063-.438T9 14q0-.625-.438-1.063T7.5 12.5q-.625 0-1.063.438T6 14q0 .625.438 1.063T7.5 15.5Zm9 0q.625 0 1.063-.438T18 14q0-.625-.438-1.063T16.5 12.5q-.625 0-1.063.438T15 14q0 .625.438 1.063T16.5 15.5Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'material-symbols:flight': {
				body: '<path d="M3 20v-2l2-1v-4L2 11V9l3 1V6q0-.825.588-1.413T7 4q.825 0 1.413.588T9 6v4l3-1v-2l2 2v2l-3 1v4l3 1v2l-5-1.5L4 18.5L3 20Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'material-symbols:sports-soccer': {
				body: '<path d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.137 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.137T12 22Zm-1-2.05V18.9l-4.5-1.4q-.275-.075-.488-.288T5.8 16.75L4.05 13q1.925-1.975 4.663-2.488T14.25 11.5l1.4 4.5q.075.275-.038.525t-.362.4L12 18.05v1.9Zm7.95-3q.5-1.05.775-2.175T20 12q0-1.925-.688-3.625T17.25 5.5L15.5 7.25q-.275.275-.638.363t-.762-.012L9.6 6.2q-.4-.125-.7-.425t-.4-.7L8.25 3.25Q6.55 4.325 5.275 6.05T3.05 9.95L4.8 12.75q.125.4.425.7t.7.4l4.5 1.4q.4.125.7.425t.4.7l.25 1.825q1.7-1.075 2.975-2.8T17.95 17Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'material-symbols:sports-basketball': {
				body: '<path d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.137 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.137T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20Zm0-8Zm-1-8.95v7.9q0 .425.288.713T12 11.95q.425 0 .713-.288T13 11.25v-7.9q-1.05-.175-2 0Zm2 17.9v-7.9q0-.425-.288-.713T12 12.05q-.425 0-.713.288T11 12.75v7.9q1.05.175 2 0Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'material-symbols:science': {
				body: '<path d="M6 22q-.825 0-1.413-.588T4 20q0-.425.163-.8t.437-.65L9 13.9V6H8q-.425 0-.713-.288T7 5q0-.425.288-.713T8 4h8q.425 0 .713.288T17 5q0 .425-.288.713T16 6h-1v7.9l4.4 4.65q.275.275.438.65T20 20q0 .825-.588 1.413T18 22H6Zm0-2h12l-4-4.25V6h-4v9.75L6 20Z"/>',
				left: 0, top: 0, width: 24, height: 24
			},
			'material-symbols:smartphone': {
				body: '<path d="M7 23q-.825 0-1.413-.588T5 21V3q0-.825.588-1.413T7 1h10q.825 0 1.413.588T19 3v18q0 .825-.588 1.413T17 23H7Zm0-5h10V6H7v12Zm0 3h10v-1H7v1Zm0-16h10V3H7v2Zm0 0V3v2Zm0 16v1-1Z"/>',
				left: 0, top: 0, width: 24, height: 24
			}
		};

		// Load these immediately into cache
		Object.entries(criticalIconData).forEach(([iconName, data]) => {
			this.cache.set(iconName, data);
		});

		// Only log once at startup
		if (import.meta.env.DEV && typeof window !== 'undefined' && !window.__critical_icons_logged) {
			console.log(`⚡ Preloaded ${Object.keys(criticalIconData).length} critical icons synchronously`);
			window.__critical_icons_logged = true;
		}

		// Also immediately start preloading the most common additional icons
		this.preloadImmediate([
			// Fallback icons for SmartImage
			'heroicons-outline:globe-alt',
			'mdi:newspaper',
			// Common sports icons
			'material-symbols:sports-football',
			'material-symbols:sports-baseball',
			'material-symbols:sports-tennis',
			// Common UI icons
			'heroicons-outline:banknotes',
			'heroicons-outline:chart-bar',
			'heroicons-outline:arrow-trending-up',
			'material-symbols:vaccines',
			'material-symbols:stethoscope',
			'heroicons-outline:film',
			'material-symbols:theater-comedy',
			'heroicons-outline:computer-desktop',
			'mdi:robot-outline',
			'material-symbols:how-to-vote',
			'heroicons-outline:building-library'
		]).catch(() => {
			// Silent fail for additional preloading
		});
	}

	/**
	 * Get all missing icons that have been checked
	 */
	getMissingIcons(): string[] {
		return Array.from(this.missingIcons);
	}

	/**
	 * Get statistics about icon loading
	 */
	getStats(): {
		cached: number;
		missing: number;
		checked: number;
		successRate: number;
	} {
		const cached = this.cache.size;
		const missing = this.missingIcons.size;
		const checked = this.checkedIcons.size;
		const successRate = checked > 0 ? ((checked - missing) / checked) * 100 : 0;

		return {
			cached,
			missing,
			checked,
			successRate: Math.round(successRate * 100) / 100
		};
	}

	/**
	 * Export missing icons report
	 */
	exportMissingIconsReport(): {
		missingIcons: string[];
		byPrefix: Record<string, string[]>;
		stats: ReturnType<typeof this.getStats>;
	} {
		const missingIcons = this.getMissingIcons();
		const byPrefix: Record<string, string[]> = {};

		// Group missing icons by prefix
		missingIcons.forEach(iconName => {
			const [prefix] = iconName.split(':');
			if (prefix) {
				if (!byPrefix[prefix]) {
					byPrefix[prefix] = [];
				}
				byPrefix[prefix].push(iconName);
			}
		});

		return {
			missingIcons,
			byPrefix,
			stats: this.getStats()
		};
	}

	/**
	 * Get cache size for debugging
	 */
	getCacheSize(): number {
		return this.cache.size;
	}

	/**
	 * Clear cache (useful for testing)
	 */
	clearCache(): void {
		this.cache.clear();
		this.pendingRequests.clear();
		this.preloadQueue.clear();
		this.missingIcons.clear();
		this.checkedIcons.clear();
	}
}

// Export singleton instance
export const iconService = new IconService();

// Expose for debugging in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	(window as any).__iconService = iconService;
	
	// Add a global function to easily check missing icons
	(window as any).__checkMissingIcons = () => {
		const report = iconService.exportMissingIconsReport();
		console.group('🔍 Icon Loading Report');
		console.log('Stats:', report.stats);
		
		if (report.missingIcons.length > 0) {
			console.group('❌ Missing Icons');
			Object.entries(report.byPrefix).forEach(([prefix, icons]) => {
				console.log(`${prefix}:`, icons.map(icon => icon.split(':')[1]));
			});
			console.groupEnd();
		} else {
			console.log('✅ All icons loaded successfully!');
		}
		
		console.groupEnd();
		return report;
	};
}