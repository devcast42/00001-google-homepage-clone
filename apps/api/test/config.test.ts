import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('uses sensible defaults', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ host: '0.0.0.0', port: 3000, rateLimitPerMinute: 300, trustProxy: false });
    expect(config.indexPath).toMatch(/data[/\\]index\.json$/);
  });

  it('reads overrides', () => {
    expect(loadConfig({ PORT: '8080', TRUST_PROXY: 'true' })).toMatchObject({ port: 8080, trustProxy: true });
  });

  it('fails fast on invalid values', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ RATE_LIMIT_PER_MINUTE: '0' })).toThrow(/RATE_LIMIT_PER_MINUTE/);
  });
});
