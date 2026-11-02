import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { IndexBuilder, type SourceDocument } from '@docseek/engine';
import { buildApp } from '../src/app.js';

const doc = (id: string, title: string, body: string, source = 'nodejs'): SourceDocument => ({
  id,
  url: `https://example.com/${id}`,
  source,
  title,
  breadcrumbs: ['Root'],
  body,
});

const documents = [
  doc('readfile', 'fs.readFile(path, callback)', 'Asynchronously reads the entire contents of a file.'),
  doc('writefile', 'fs.writeFile(file, data)', 'Asynchronously writes data to a file.'),
  doc('listener', 'emitter.on(eventName, listener)', 'Adds the listener function.'),
  ...Array.from({ length: 25 }, (_, i) => doc(`file-${i}`, `File topic ${i}`, 'Something about a file.')),
  doc('fetch', 'fetch()', 'Fetches a file from the network.', 'mdn'),
];
const index = new IndexBuilder().addAll(documents).build();
const webRoot = fileURLToPath(new URL('fixtures/web', import.meta.url));

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp({ index, webRoot, rateLimitPerMinute: 1000 });
});
afterAll(() => app.close());

describe('GET /api/search', () => {
  it('returns ranked, highlighted results with pagination metadata', async () => {
    const response = await app.inject('/api/search?q=readFile');
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ query: 'readFile', page: 1, pageSize: 10 });
    expect(body.results[0]).toMatchObject({
      id: 'readfile',
      url: 'https://example.com/readfile',
      title: { text: 'fs.readFile(path, callback)', highlights: [[3, 11]] },
    });
    expect(typeof body.tookMs).toBe('number');
  });

  it('paginates', async () => {
    const first = (await app.inject('/api/search?q=file&pageSize=10')).json();
    const third = (await app.inject('/api/search?q=file&pageSize=10&page=3')).json();
    expect(first.total).toBeGreaterThan(20);
    expect(first.totalPages).toBe(Math.ceil(first.total / 10));
    expect(third.results.length).toBe(first.total - 20);
    expect(third.results.map((r: { id: string }) => r.id)).not.toContain(first.results[0].id);
  });

  it('filters by source', async () => {
    const body = (await app.inject('/api/search?q=file&source=mdn')).json();
    expect(body.results.map((r: { id: string }) => r.id)).toEqual(['fetch']);
  });

  it('suggests corrections', async () => {
    expect((await app.inject('/api/search?q=lisener')).json().didYouMean).toBe('listener');
  });

  it.each([
    ['missing q', '/api/search'],
    ['empty q', '/api/search?q='],
    ['page too large', '/api/search?q=x&page=1000'],
    ['page size too large', '/api/search?q=x&pageSize=500'],
    ['non numeric page', '/api/search?q=x&page=abc'],
    ['invalid source', '/api/search?q=x&source=../etc'],
    ['query too long', `/api/search?q=${'a'.repeat(201)}`],
  ])('rejects invalid input: %s', async (_name, url) => {
    const response = await app.inject(url);
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_request');
  });

  it('caches repeated queries regardless of case and whitespace', async () => {
    const first = await app.inject('/api/search?q=writeFile%20data');
    const second = await app.inject('/api/search?q=%20WRITEFILE%20DATA%20');
    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.json().results).toEqual(first.json().results);
  });

  it('sets caching, timing and security headers', async () => {
    const { headers } = await app.inject('/api/search?q=file');
    expect(headers['cache-control']).toBe('public, max-age=60');
    expect(headers['server-timing']).toMatch(/^search;dur=/);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('GET /api/suggest', () => {
  it('completes partial input', async () => {
    const body = (await app.inject('/api/suggest?q=emitter.o')).json();
    expect(body.suggestions[0]).toMatchObject({ id: 'listener', title: 'emitter.on(eventName, listener)' });
  });

  it('respects the limit', async () => {
    expect((await app.inject('/api/suggest?q=fil&limit=3')).json().suggestions).toHaveLength(3);
  });
});

describe('other routes', () => {
  it('exposes stats and health checks', async () => {
    expect((await app.inject('/api/stats')).json()).toMatchObject({
      documents: documents.length,
      sources: { nodejs: documents.length - 1, mdn: 1 },
    });
    expect((await app.inject('/healthz')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/readyz')).json()).toEqual({ status: 'ready', documents: documents.length });
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const response = await app.inject('/api/nope');
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
  });

  it('serves the SPA for HTML navigations and immutable caching for assets', async () => {
    const page = await app.inject({ url: '/search?q=x', headers: { accept: 'text/html' } });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('<div id="root">');
    expect(page.headers['cache-control']).toBe('no-cache');

    const asset = await app.inject('/assets/app-abc123.js');
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    expect((await app.inject('/missing.png')).statusCode).toBe(404);
  });
});

describe('rate limiting', () => {
  it('returns 429 after the limit and exempts health checks', async () => {
    const limited = await buildApp({ index, rateLimitPerMinute: 2 });
    try {
      const codes = [];
      for (let i = 0; i < 3; i++) codes.push((await limited.inject('/api/search?q=file')).statusCode);
      expect(codes).toEqual([200, 200, 429]);
      expect((await limited.inject('/api/search?q=file')).json().error.code).toBe('rate_limited');
      expect((await limited.inject('/healthz')).statusCode).toBe(200);
    } finally {
      await limited.close();
    }
  });
});
