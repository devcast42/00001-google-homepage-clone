import { describe, expect, it } from 'vitest';
import { FetchError, PoliteFetcher, retryAfterMs } from '../src/fetcher.js';
import { fakeWeb, noSleep } from './fake-web.js';

describe('PoliteFetcher', () => {
  it('retries 503 responses and eventually succeeds', async () => {
    let calls = 0;
    const fetch = (async () =>
      ++calls < 3 ? new Response('busy', { status: 503 }) : new Response('ok')) as typeof globalThis.fetch;
    const fetcher = new PoliteFetcher({ userAgent: 'test', minIntervalMs: 0, fetch, sleep: noSleep });
    await expect(fetcher.get('https://a.test/')).resolves.toMatchObject({ body: 'ok' });
    expect(calls).toBe(3);
  });

  it('does not retry 404 and reports the status', async () => {
    const { fetch, requests } = fakeWeb({});
    const fetcher = new PoliteFetcher({ userAgent: 'test', minIntervalMs: 0, fetch, sleep: noSleep });
    const error = await fetcher.get('https://a.test/missing').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FetchError);
    expect((error as FetchError).status).toBe(404);
    expect(requests).toHaveLength(1);
  });

  it('gives up after maxRetries network errors', async () => {
    let calls = 0;
    const fetch = (async () => {
      calls++;
      throw new TypeError('fetch failed');
    }) as typeof globalThis.fetch;
    const fetcher = new PoliteFetcher({ userAgent: 'test', minIntervalMs: 0, maxRetries: 2, fetch, sleep: noSleep });
    await expect(fetcher.get('https://a.test/')).rejects.toThrow(/3 intentos/);
    expect(calls).toBe(3);
  });

  it('spaces requests to the same host but not across hosts', async () => {
    const clock = 0;
    const waits: number[] = [];
    const { fetch } = fakeWeb({ 'https://a.test/1': 'x', 'https://a.test/2': 'x', 'https://b.test/1': 'x' });
    const fetcher = new PoliteFetcher({
      userAgent: 'test',
      minIntervalMs: 500,
      fetch,
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    await Promise.all([
      fetcher.get('https://a.test/1'),
      fetcher.get('https://a.test/2'),
      fetcher.get('https://b.test/1'),
    ]);
    expect(waits).toEqual([500]);
  });

  it('sends the configured user agent', async () => {
    let userAgent: string | null = null;
    const fetch = (async (_input: unknown, init?: RequestInit) => {
      userAgent = new Headers(init?.headers).get('user-agent');
      return new Response('ok');
    }) as typeof globalThis.fetch;
    await new PoliteFetcher({ userAgent: 'DocSeekBot/0.1', minIntervalMs: 0, fetch }).get('https://a.test/');
    expect(userAgent).toBe('DocSeekBot/0.1');
  });
});

describe('retryAfterMs', () => {
  it('parses seconds and HTTP dates', () => {
    expect(retryAfterMs('2')).toBe(2000);
    expect(retryAfterMs(null)).toBe(0);
    expect(retryAfterMs('garbage')).toBe(0);
    expect(retryAfterMs(new Date(Date.now() + 60_000).toUTCString())).toBeGreaterThan(50_000);
  });
});
