// Wikipedia content cache
const wikipediaCache = new Map<string, WikipediaContent>();

export interface WikipediaContent {
  extract: string;
  thumbnail: { source: string } | null;
  originalImage: { source: string } | null;
  title: string;
  wikiUrl: string;
}

async function resolveWikipediaUrl(wikiId: string): Promise<string> {
  if (/^Q\d+$/.test(wikiId)) {
    const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikiId}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`;
    const wikidataResponse = await fetch(wikidataUrl);
    if (!wikidataResponse.ok) {
      throw new Error("Failed to fetch Wikidata entity");
    }
    const wikidataData: {
      entities?: Record<string, { sitelinks?: { enwiki?: { title?: string } } }>;
    } = await wikidataResponse.json();
    const entity = wikidataData.entities?.[wikiId];
    const enwikiTitle = entity?.sitelinks?.enwiki?.title;
    if (!enwikiTitle) {
      throw new Error("No English Wikipedia page found for this entity");
    }
    console.log(`Resolved Q-ID ${wikiId} to Wikipedia page: ${enwikiTitle}`);
    return `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enwikiTitle)}`;
  }
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiId}`;
}

/**
 * Fetch Wikipedia content from API
 * Supports both regular Wikipedia page IDs and Wikidata Q-IDs
 */
export async function fetchWikipediaContent(
  wikiId: string,
): Promise<WikipediaContent> {
  // Check cache first
  if (wikipediaCache.has(wikiId)) {
    const cached = wikipediaCache.get(wikiId);
    if (cached) return cached;
  }

  try {
    const url = await resolveWikipediaUrl(wikiId);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch Wikipedia content");
    }

    const data: {
      extract?: string;
      thumbnail?: { source: string } | null;
      originalimage?: { source: string } | null;
      title?: string;
      content_urls?: { desktop?: { page?: string } };
    } = await response.json();
    const result: WikipediaContent = {
      extract: data.extract || "No summary available.",
      thumbnail: data.thumbnail || null,
      originalImage: data.originalimage || null,
      title: data.title || "",
      wikiUrl:
        data.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title || wikiId)}`,
    };

    // Cache the content
    wikipediaCache.set(wikiId, result);
    return result;
  } catch (error) {
    console.error("Error fetching Wikipedia content:", error);
    return {
      extract: "Failed to load Wikipedia content.",
      thumbnail: null,
      originalImage: null,
      title: "",
      wikiUrl: "",
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
