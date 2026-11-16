import { GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX } from '../shims/env';

function filterValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (
    lower.endsWith('.svg') ||
    lower.endsWith('.tiff') ||
    lower.endsWith('.tif') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.mp4')
  ) {
    return false;
  }
  return /^https?:\/\//i.test(url);
}

/**
 * Searches Google Custom Search API for images.
 */
async function searchGoogleCustomSearch(query) {
  const apiKey = (GOOGLE_SEARCH_API_KEY || '').trim();
  const cx = (GOOGLE_SEARCH_CX || '').trim();

  if (!apiKey || !cx) {
    return null;
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
      apiKey,
    )}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(
      query,
    )}&searchType=image&num=15`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('[ImageSearch] Google Custom Search failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data?.items)) {
      return [];
    }

    return data.items
      .filter(item => filterValidImageUrl(item?.link))
      .map((item, idx) => ({
        id: `google-${idx}-${item.link}`,
        title: item.title || '',
        url: item.link,
        thumbUrl: item.image?.thumbnailLink || item.link,
        source: 'Google',
      }));
  } catch (error) {
    console.warn('[ImageSearch] Google search error:', error.message);
    return null;
  }
}

/**
 * Searches Wikipedia page images.
 */
async function searchWikipediaImages(query) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=prefixsearch&gpssearch=${encodeURIComponent(
      query,
    )}&gpslimit=15&prop=pageimages&piprop=original|thumbnail&pithumbsize=600&format=json&origin=*`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    if (!data?.query?.pages) return [];

    const pages = Object.values(data.query.pages);
    const results = [];

    for (const page of pages) {
      const imgUrl = page.original?.source || page.thumbnail?.source;
      if (filterValidImageUrl(imgUrl)) {
        results.push({
          id: `wiki-${page.pageid}`,
          title: page.title || '',
          url: imgUrl,
          thumbUrl: page.thumbnail?.source || imgUrl,
          source: 'Wikipedia',
        });
      }
    }

    return results;
  } catch (error) {
    console.warn('[ImageSearch] Wikipedia search error:', error.message);
    return [];
  }
}

/**
 * Searches Wikimedia Commons for public domain/creative commons images.
 */
async function searchWikimediaCommons(query) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query,
    )}&gsrlimit=20&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    if (!data?.query?.pages) return [];

    const pages = Object.values(data.query.pages);
    const results = [];

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      const imgUrl = info?.url;
      const mime = (info?.mime || '').toLowerCase();

      if (
        imgUrl &&
        filterValidImageUrl(imgUrl) &&
        (mime.includes('jpeg') || mime.includes('png') || mime.includes('webp'))
      ) {
        results.push({
          id: `commons-${page.pageid}`,
          title: (page.title || '').replace(/^File:/i, ''),
          url: imgUrl,
          thumbUrl: imgUrl,
          source: 'Wikimedia',
        });
      }
    }

    return results;
  } catch (error) {
    console.warn('[ImageSearch] Wikimedia Commons error:', error.message);
    return [];
  }
}

/**
 * Main search function:
 * 1. Attempts Google Custom Search if configured.
 * 2. Falls back to Wikipedia / Wikimedia open image search so results always appear natively.
 */
export async function searchOnlineImages(query) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) {
    return [];
  }

  // 1. Try Google Custom Search API
  const googleResults = await searchGoogleCustomSearch(q);
  if (Array.isArray(googleResults) && googleResults.length > 0) {
    return googleResults;
  }

  // 2. Open Web Image APIs (Wikipedia & Wikimedia Commons)
  const [wikiResults, commonsResults] = await Promise.all([
    searchWikipediaImages(q),
    searchWikimediaCommons(q),
  ]);

  const combined = [...wikiResults, ...commonsResults];

  // Deduplicate by URL
  const seenUrls = new Set();
  const uniqueResults = [];

  for (const item of combined) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      uniqueResults.push(item);
    }
  }

  return uniqueResults;
}
