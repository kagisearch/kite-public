/**
 * Client-side geocoding service.
 * Calls /api/geocode which proxies Nominatim, with local caching.
 */

const clientCache = new Map<string, { lat: number; lng: number } | null>();
const pendingRequests = new Map<string, Promise<{ lat: number; lng: number } | null>>();

/**
 * Geocode a location string to [lat, lng] coordinates.
 * Returns null if the location cannot be resolved.
 * Results are cached client-side for the session lifetime.
 */
export async function geocodeLocation(
	location: string,
): Promise<{ lat: number; lng: number } | null> {
	const key = location.toLowerCase().trim();
	if (!key) return null;

	// Check client cache
	if (clientCache.has(key)) {
		return clientCache.get(key) ?? null;
	}

	// Deduplicate in-flight requests
	if (pendingRequests.has(key)) {
		return pendingRequests.get(key)!;
	}

	const request = (async () => {
		try {
			const response = await fetch(`/api/geocode?q=${encodeURIComponent(location)}`);

			if (!response.ok) {
				clientCache.set(key, null);
				return null;
			}

			const data = await response.json();
			if (!data || data.lat == null || data.lng == null) {
				clientCache.set(key, null);
				return null;
			}

			const result = { lat: data.lat, lng: data.lng };
			clientCache.set(key, result);
			return result;
		} catch {
			clientCache.set(key, null);
			return null;
		} finally {
			pendingRequests.delete(key);
		}
	})();

	pendingRequests.set(key, request);
	return request;
}
