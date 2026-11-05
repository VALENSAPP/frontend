import { dedupeRequest, invalidateApiCache } from './apiDeduplicator';

describe('apiDeduplicator', () => {
  beforeEach(() => {
    invalidateApiCache(/.*/);
  });

  it('deduplicates concurrent in-flight requests', async () => {
    let callCount = 0;
    const mockFetcher = () =>
      new Promise(resolve => {
        callCount++;
        setTimeout(() => resolve({ id: 1, name: 'Test' }), 50);
      });

    const [res1, res2, res3] = await Promise.all([
      dedupeRequest('test:1', mockFetcher),
      dedupeRequest('test:1', mockFetcher),
      dedupeRequest('test:1', mockFetcher),
    ]);

    expect(callCount).toBe(1);
    expect(res1).toEqual({ id: 1, name: 'Test' });
    expect(res2).toEqual({ id: 1, name: 'Test' });
    expect(res3).toEqual({ id: 1, name: 'Test' });
  });

  it('serves from short-TTL cache within ttlMs', async () => {
    let callCount = 0;
    const mockFetcher = async () => {
      callCount++;
      return { count: callCount };
    };

    const first = await dedupeRequest('counter', mockFetcher, { ttlMs: 1000 });
    const second = await dedupeRequest('counter', mockFetcher, { ttlMs: 1000 });

    expect(callCount).toBe(1);
    expect(first.count).toBe(1);
    expect(second.count).toBe(1);
  });

  it('clears cache on invalidateApiCache', async () => {
    let callCount = 0;
    const mockFetcher = async () => {
      callCount++;
      return { count: callCount };
    };

    await dedupeRequest('key:1', mockFetcher, { ttlMs: 1000 });
    invalidateApiCache('key:1');
    await dedupeRequest('key:1', mockFetcher, { ttlMs: 1000 });

    expect(callCount).toBe(2);
  });
});
