/**
 * Favicon Service - Parallel fetching with Google fallback
 *
 * This service fetches favicons from multiple sources in parallel:
 * 1. Google's fast favicon service (lower quality but fast)
 * 2. Favicone.com's high quality service (higher quality but slower)
 *
 * Strategy:
 * - Fire both requests in parallel
 * - Use Google's result immediately if it arrives first
 * - Update to high quality version when/if it arrives
 * - Cache results to avoid repeated fetches
 */

import { asset } from "$app/paths";

interface FaviconResult {
  url: string;
  quality: "low" | "high";
  source: "google" | "favicone" | "placeholder";
}

type FaviconCallback = (result: FaviconResult) => void;

// Cache for favicon results
const faviconCache = new Map<string, FaviconResult>();

// Pending requests to avoid duplicate fetches
const pendingRequests = new Map<string, Promise<void>>();

// Callbacks waiting for favicon updates
const callbacks = new Map<string, Set<FaviconCallback>>();

// Known domains where favicone.com doesn't work (to avoid unnecessary 404s)
const problematicDomains = new Set([
  "rt.com",
  "firstpost.com",
  // Add more as discovered
]);

/**
 * Get Google favicon URL (fast, lower quality)
 */
function getGoogleFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Get Favicone.com favicon URL (slower, high quality)
 */
function getFaviconeFaviconUrl(domain: string): string {
  return `https://favicone.com/${domain}?s=256`;
}

/**
 * Check if an image URL loads successfully
 */
async function checkImageLoads(url: string, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      resolve(false);
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };

    // Use a try-catch to prevent console errors for 404s
    try {
      img.src = url;
    } catch (e) {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/**
 * Fetch favicon with parallel requests and progressive enhancement
 *
 * @param domain - The domain to fetch favicon for
 * @param callback - Optional callback for progressive updates
 * @returns Initial favicon result (may be updated via callback)
 */
export async function fetchFavicon(
  domain: string,
  callback?: FaviconCallback,
): Promise<FaviconResult> {
  // Return cached result if available
  const cached = faviconCache.get(domain);
  if (cached) {
    // If we have a high quality cached version, return it immediately
    if (cached.quality === "high") {
      return cached;
    }
    // If we only have low quality, still try to get high quality in background
    if (!pendingRequests.has(domain)) {
      fetchHighQualityInBackground(domain);
    }
    return cached;
  }

  // Register callback if provided
  if (callback) {
    if (!callbacks.has(domain)) {
      callbacks.set(domain, new Set());
    }
    const domainCallbacks = callbacks.get(domain);
    if (domainCallbacks) {
      domainCallbacks.add(callback);
    } else {
      callbacks.set(domain, new Set([callback]));
    }
  }

  // Check if request is already pending
  if (pendingRequests.has(domain)) {
    await pendingRequests.get(domain);
    return faviconCache.get(domain) || getPlaceholderResult();
  }

  // Start new parallel fetch
  const fetchPromise = fetchParallel(domain);
  pendingRequests.set(domain, fetchPromise);

  try {
    await fetchPromise;
  } finally {
    pendingRequests.delete(domain);
  }

  return faviconCache.get(domain) || getPlaceholderResult();
}

/**
 * Fetch favicons from both sources in parallel
 */
async function fetchParallel(domain: string): Promise<void> {
  const googleUrl = getGoogleFaviconUrl(domain);
  const faviconeUrl = getFaviconeFaviconUrl(domain);

  // Race condition: use whichever loads first
  const googlePromise = checkImageLoads(googleUrl, 2000).then((success) => ({
    success,
    url: googleUrl,
    quality: "low" as const,
    source: "google" as const,
  }));

  // Skip high-quality fetch for known problematic domains
  const skipHighQuality = problematicDomains.has(domain);

  const faviconePromise = skipHighQuality
    ? Promise.resolve({
        success: false,
        url: faviconeUrl,
        quality: "high" as const,
        source: "favicone" as const,
      })
    : checkImageLoads(faviconeUrl, 5000).then((success) => ({
        success,
        url: faviconeUrl,
        quality: "high" as const,
        source: "favicone" as const,
      }));

  // Try to get any result quickly
  try {
    const firstResult = await Promise.race([googlePromise, faviconePromise]);

    if (firstResult.success) {
      const result: FaviconResult = {
        url: firstResult.url,
        quality: firstResult.quality,
        source: firstResult.source,
      };

      // Cache and notify
      faviconCache.set(domain, result);
      notifyCallbacks(domain, result);

      // If we got the low quality version first, still wait for high quality
      if (firstResult.quality === "low") {
        faviconePromise
          .then((faviconeResult) => {
            if (faviconeResult.success) {
              const highQualityResult: FaviconResult = {
                url: faviconeResult.url,
                quality: "high",
                source: "favicone",
              };
              faviconCache.set(domain, highQualityResult);
              notifyCallbacks(domain, highQualityResult);
            } else {
              // High quality failed, but we have Google's version - this is fine
              console.debug(
                `High-quality favicon not available for ${domain}, using Google favicon`,
              );
            }
          })
          .catch(() => {
            // Ignore errors for background high quality fetch
          });
      }
    } else {
      // First one failed, wait for the other
      const results = await Promise.allSettled([
        googlePromise,
        faviconePromise,
      ]);

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          const faviconResult: FaviconResult = {
            url: result.value.url,
            quality: result.value.quality,
            source: result.value.source,
          };
          faviconCache.set(domain, faviconResult);
          notifyCallbacks(domain, faviconResult);
          return;
        }
      }

      // Both failed, use placeholder
      const placeholder = getPlaceholderResult();
      faviconCache.set(domain, placeholder);
      notifyCallbacks(domain, placeholder);
    }
  } catch (error) {
    console.error(`Error fetching favicon for ${domain}:`, error);
    const placeholder = getPlaceholderResult();
    faviconCache.set(domain, placeholder);
    notifyCallbacks(domain, placeholder);
  }
}

/**
 * Fetch high quality favicon in background (for cached low quality results)
 */
async function fetchHighQualityInBackground(domain: string): Promise<void> {
  const faviconeUrl = getFaviconeFaviconUrl(domain);

  try {
    const success = await checkImageLoads(faviconeUrl, 5000);
    if (success) {
      const result: FaviconResult = {
        url: faviconeUrl,
        quality: "high",
        source: "favicone",
      };
      faviconCache.set(domain, result);
      notifyCallbacks(domain, result);
    }
  } catch (error) {
    // Silently fail for background updates
    console.debug(`Background high quality favicon fetch failed for ${domain}`);
  }
}

/**
 * Notify all callbacks for a domain
 */
function notifyCallbacks(domain: string, result: FaviconResult): void {
  const domainCallbacks = callbacks.get(domain);
  if (!domainCallbacks) return;
  for (const callback of domainCallbacks) {
    try {
      callback(result);
    } catch (error) {
      console.error("Error in favicon callback:", error);
    }
  }
}

/**
 * Get placeholder favicon result
 */
function getPlaceholderResult(): FaviconResult {
  return {
    url: asset('/svg/placeholder.svg'),
    quality: "low",
    source: "placeholder",
  };
}

/**
 * Clear favicon cache (useful for testing or memory management)
 */
export function clearFaviconCache(): void {
  faviconCache.clear();
  callbacks.clear();
}

/**
 * Prefetch favicons for multiple domains
 */
export async function prefetchFavicons(domains: string[]): Promise<void> {
  const promises = domains.map((domain) =>
    fetchFavicon(domain).catch(() => {
      // Silently fail for prefetch
    }),
  );
  await Promise.allSettled(promises);
}

/**
 * Get simple favicon URL without fetching (for initial render)
 * Returns Google's URL for immediate use
 */
export function getImmediateFaviconUrl(domain: string): string {
  // Check cache first
  const cached = faviconCache.get(domain);
  if (cached) {
    return cached.url;
  }

  // Return Google URL for immediate display
  return getGoogleFaviconUrl(domain);
}
