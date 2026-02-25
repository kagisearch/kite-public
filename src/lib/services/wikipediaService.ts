export interface WikipediaContent {
	extract: string;
	thumbnail: { source: string } | null;
	originalImage: { source: string } | null;
	title: string;
	wikiUrl: string;
}

interface WikipediaApiResponse {
	extract?: string;
	thumbnail?: { source: string };
	originalimage?: { source: string };
	title?: string;
	content_urls?: {
		desktop?: {
			page?: string;
		};
	};
}

interface WikidataApiResponse {
	entities?: {
		[qid: string]: {
			sitelinks?: {
				enwiki?: {
					title?: string;
				};
			};
		};
	};
}

// Wikipedia content cache
const wikipediaCache = new Map<string, WikipediaContent>();

/**
 * Fetch Wikipedia content from API
 * Supports both regular Wikipedia page IDs and Wikidata Q-IDs
 * @param wikiId - Wikipedia page ID or Wikidata Q-ID
 * @param language - Wikipedia language code (e.g., 'en', 'it', 'fr'). Defaults to 'en'
 */
export async function fetchWikipediaContent(
	wikiId: string,
	language: string = 'en',
): Promise<WikipediaContent> {
	// Include language in cache key
	const cacheKey = `${wikiId}:${language}`;

	// Check cache first
	if (wikipediaCache.has(cacheKey)) {
		return wikipediaCache.get(cacheKey)!;
	}

	try {
		let url: string;

		// Check if this is a Wikidata Q-ID
		if (/^Q\d+$/.test(wikiId)) {
			// First, resolve the Q-ID to get the actual Wikipedia page in the requested language
			const wikiSiteFilter = `${language}wiki`;
			const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikiId}&props=sitelinks&sitefilter=${wikiSiteFilter}&format=json&origin=*`;
			const wikidataResponse = await fetch(wikidataUrl);

			if (!wikidataResponse.ok) {
				throw new Error('Failed to fetch Wikidata entity');
			}

			const wikidataData = (await wikidataResponse.json()) as WikidataApiResponse;
			const entity = wikidataData.entities?.[wikiId];
			const wikiTitle =
				entity?.sitelinks?.[`${language}wiki` as keyof typeof entity.sitelinks]?.title;

			if (!wikiTitle) {
				throw new Error(`No ${language.toUpperCase()} Wikipedia page found for this entity`);
			}

			// Now fetch the Wikipedia content using the resolved title
			url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
			console.log(
				`Resolved Q-ID ${wikiId} to ${language.toUpperCase()} Wikipedia page: ${wikiTitle}`,
			);
		} else {
			// Regular Wikipedia page ID
			url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${wikiId}`;
		}

		let response = await fetch(url);

		// If the article doesn't exist in the requested language, fall back to English
		if (!response.ok && language !== 'en') {
			console.log(
				`Article not found in ${language.toUpperCase()} Wikipedia, falling back to English`,
			);

			// Try to fetch from English Wikipedia instead
			if (/^Q\d+$/.test(wikiId)) {
				// For Q-IDs, resolve to English Wikipedia
				const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikiId}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`;
				const wikidataResponse = await fetch(wikidataUrl);

				if (wikidataResponse.ok) {
					const wikidataData = (await wikidataResponse.json()) as WikidataApiResponse;
					const entity = wikidataData.entities?.[wikiId];
					const wikiTitle = entity?.sitelinks?.enwiki?.title;

					if (wikiTitle) {
						url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
						response = await fetch(url);
					}
				}
			} else {
				// For regular page IDs, try the same ID on English Wikipedia
				url = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiId}`;
				response = await fetch(url);
			}
		}

		if (!response.ok) {
			throw new Error('Failed to fetch Wikipedia content');
		}

		const data = (await response.json()) as WikipediaApiResponse;
		const result: WikipediaContent = {
			extract: data.extract || 'No summary available.',
			thumbnail: data.thumbnail || null,
			originalImage: data.originalimage || null,
			title: data.title || '',
			wikiUrl:
				data.content_urls?.desktop?.page ||
				`https://${language}.wikipedia.org/wiki/${encodeURIComponent(data.title || wikiId)}`,
		};

		// Cache the content with language-specific key
		wikipediaCache.set(cacheKey, result);
		return result;
	} catch (error) {
		console.error('Error fetching Wikipedia content:', error);
		return {
			extract: 'Failed to load Wikipedia content.',
			thumbnail: null,
			originalImage: null,
			title: '',
			wikiUrl: '',
		};
	}
}

/**
 * Clear the Wikipedia cache
 */
export function clearWikipediaCache() {
	wikipediaCache.clear();
}

/**
 * Get cache size
 */
export function getWikipediaCacheSize(): number {
	return wikipediaCache.size;
}
