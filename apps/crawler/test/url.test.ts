import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../src/url.js';

describe('normalizeUrl', () => {
  it('resolves relative links and drops the fragment', () => {
    expect(normalizeUrl('path.html#x', 'https://nodejs.org/api/fs.html')).toBe(
      'https://nodejs.org/api/path.html',
    );
  });

  it('lowercases the host, removes default ports and tracking params, sorts the query', () => {
    expect(normalizeUrl('HTTPS://NodeJS.org:443/api/?b=2&utm_source=x&a=1')).toBe(
      'https://nodejs.org/api/?a=1&b=2',
    );
  });

  it('rejects non-http schemes and invalid URLs', () => {
    expect(normalizeUrl('mailto:someone@example.com')).toBeUndefined();
    expect(normalizeUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeUrl('http://')).toBeUndefined();
  });
});
