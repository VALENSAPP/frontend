/**
 * API Request Deduplicator & Short-TTL Cache
 *
 * Prevents duplicate concurrent in-flight requests and eliminates waterfall redundant fetches
 * for high-frequency read endpoints without breaking caller contracts.
 */

const inFlightRequests = new Map();
const responseCache = new Map();

/**
 * Executes an async API request with automatic in-flight deduplication and short-TTL caching.
 *
 * @param {string} cacheKey - Unique key representing the request (e.g. 'user/profile:123')
 * @param {() => Promise<any>} fetcher - Function that performs the actual network request
 * @param {object} options
 * @param {number} [options.ttlMs=3000] - Cache TTL in milliseconds (default: 3000ms / 3s)
 * @param {boolean} [options.bypassCache=false] - When true, forces a network fetch while still deduplicating in-flight
 * @returns {Promise<any>}
 */
export async function dedupeRequest(cacheKey, fetcher, options = {}) {
  const { ttlMs = 3000, bypassCache = false } = options;
  const now = Date.now();

  // 1. Check active short-TTL memory cache
  if (!bypassCache && responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey);
    if (now - cached.timestamp < ttlMs) {
      return cached.data;
    }
    responseCache.delete(cacheKey);
  }

  // 2. Check if identical request is currently in-flight
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Initiate new request and share in-flight promise
  const promise = (async () => {
    try {
      const result = await fetcher();
      if (result && !result.error && ttlMs > 0) {
        responseCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Invalidates specific cache keys or key prefixes when mutations occur (e.g. editProfile, viewOrder).
 * @param {string|RegExp} pattern
 */
export function invalidateApiCache(pattern) {
  if (typeof pattern === 'string') {
    responseCache.delete(pattern);
  } else if (pattern instanceof RegExp) {
    for (const key of responseCache.keys()) {
      if (pattern.test(key)) {
        responseCache.delete(key);
      }
    }
  }
}
