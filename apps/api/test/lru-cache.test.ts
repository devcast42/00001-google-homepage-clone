import { describe, expect, it } from 'vitest';
import { LruCache } from '../src/lru-cache.js';

describe('LruCache', () => {
  it('evicts the least recently used entry', () => {
    const cache = new LruCache<number>(2, 1000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('expires entries after the TTL', () => {
    let now = 0;
    const cache = new LruCache<string>(10, 100, () => now);
    cache.set('k', 'v');
    now = 99;
    expect(cache.get('k')).toBe('v');
    now = 300;
    expect(cache.get('k')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('rejects an invalid size', () => {
    expect(() => new LruCache(0, 1)).toThrow(RangeError);
  });
});
