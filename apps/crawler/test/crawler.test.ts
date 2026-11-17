import { describe, expect, it } from 'vitest';
import { crawl } from '../src/crawler.js';
import { PoliteFetcher } from '../src/fetcher.js';
import type { SourceConfig } from '../src/sources.js';
import { extractNodeDocs } from '../src/extractors/nodejs.js';
import { fakeWeb, noSleep } from './fake-web.js';

const section = (title: string, anchor: string, text: string) =>
  `<section><h2>${title}<span><a class=mark id=${anchor}>#</a></span></h2><p>${text}</section>`;
const page = (links: string[], ...sections: string[]) =>
  `<div id=column2>${links.map((href) => `<a href="${href}">x</a>`).join('')}</div><div id=apicontent>${sections.join('')}</div>`;

const source: SourceConfig = {
  name: 'test',
  label: 'Test',
  startUrls: ['https://docs.test/api/index.html'],
  inScope: (url) => url.host === 'docs.test' && url.pathname.startsWith('/api/'),
  extract: extractNodeDocs,
  maxPages: 50,
};

function setup(pages: Parameters<typeof fakeWeb>[0]) {
  const web = fakeWeb(pages);
  const fetcher = new PoliteFetcher({
    userAgent: 'test',
    minIntervalMs: 0,
    fetch: web.fetch,
    sleep: noSleep,
  });
  return {
    web,
    run: (overrides: Partial<SourceConfig> = {}) =>
      crawl({ ...source, ...overrides }, { fetcher, userAgent: 'test' }),
  };
}

describe('crawl', () => {
  it('follows in-scope links once, respects robots.txt and sorts the output', async () => {
    const { web, run } = setup({
      'https://docs.test/robots.txt': {
        body: 'User-agent: *\nDisallow: /api/private',
        type: 'text/plain',
      },
      'https://docs.test/api/index.html': page(
        ['b.html', 'a.html', 'private.html', 'https://other.test/api/x.html', 'a.html#frag'],
        section('Index', 'index', 'home'),
      ),
      'https://docs.test/api/a.html': page(['index.html'], section('A', 'a', 'alpha')),
      'https://docs.test/api/b.html': page([], section('B', 'b', 'beta')),
      'https://docs.test/api/private.html': page([], section('Secret', 's', 'nope')),
    });

    const result = await run();

    expect(result.documents.map((doc) => doc.title)).toEqual(['A', 'B', 'Index']);
    expect(result.stats).toMatchObject({
      pagesFetched: 3,
      pagesSkippedByRobots: 1,
      pagesFailed: 0,
      documents: 3,
    });
    expect(web.requests).not.toContain('https://docs.test/api/private.html');
    expect(web.requests.filter((url) => url === 'https://docs.test/api/a.html')).toHaveLength(1);
    expect(web.requests.some((url) => url.startsWith('https://other.test'))).toBe(false);
  });

  it('records failures and keeps going', async () => {
    const { run } = setup({
      'https://docs.test/api/index.html': page(
        ['missing.html', 'ok.html'],
        section('Index', 'i', 'x'),
      ),
      'https://docs.test/api/ok.html': page([], section('Ok', 'ok', 'y')),
    });
    const result = await run();
    expect(result.failures).toEqual([
      { url: 'https://docs.test/api/missing.html', reason: 'HTTP 404' },
    ]);
    expect(result.documents).toHaveLength(2);
  });

  it('skips pages whose content duplicates one already seen', async () => {
    const same = section('Same', 'same', 'identical body');
    const { run } = setup({
      'https://docs.test/api/index.html': page(['copy.html'], same),
      'https://docs.test/api/copy.html': page([], same),
    });
    const result = await run();
    expect(result.stats.pagesDuplicated).toBe(1);
    expect(result.documents).toHaveLength(1);
  });

  it('assumes everything is disallowed when robots.txt fails with a server error', async () => {
    const { web, run } = setup({
      'https://docs.test/robots.txt': { status: 500 },
      'https://docs.test/api/index.html': page([], section('Index', 'i', 'x')),
    });
    const result = await run();
    expect(result.documents).toEqual([]);
    expect(result.stats.pagesSkippedByRobots).toBe(1);
    expect(web.requests).not.toContain('https://docs.test/api/index.html');
  });

  it('stops at maxPages', async () => {
    const { run } = setup({
      'https://docs.test/api/index.html': page(
        ['1.html', '2.html', '3.html'],
        section('I', 'i', 'x'),
      ),
      'https://docs.test/api/1.html': page([], section('One', 'o', 'one')),
      'https://docs.test/api/2.html': page([], section('Two', 't', 'two')),
      'https://docs.test/api/3.html': page([], section('Three', 'th', 'three')),
    });
    expect((await run({ maxPages: 2 })).stats.pagesFetched).toBe(2);
  });
});
