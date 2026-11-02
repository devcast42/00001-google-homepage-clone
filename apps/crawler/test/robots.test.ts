import { describe, expect, it } from 'vitest';
import { parseRobots } from '../src/robots.js';

const NODEJS_ROBOTS = `User-Agent: *
Allow: /dist/latest/
Allow: /dist/latest/docs/api/
Allow: /api/
Disallow: /dist/
Disallow: /docs/

Sitemap: https://nodejs.org/sitemap.xml`;

describe('parseRobots', () => {
  it('applies the real nodejs.org rules', () => {
    const rules = parseRobots(NODEJS_ROBOTS, 'DocSeekBot/0.1');
    expect(rules.isAllowed('/api/fs.html')).toBe(true);
    expect(rules.isAllowed('/docs/latest/api/fs.html')).toBe(false);
    expect(rules.isAllowed('/dist/v20.0.0/')).toBe(false);
    expect(rules.isAllowed('/dist/latest/docs/api/fs.html')).toBe(true);
    expect(rules.isAllowed('/en/about')).toBe(true);
  });

  it('uses the most specific user-agent group', () => {
    const rules = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: DocSeekBot\nDisallow: /private\n',
      'DocSeekBot/0.1 (+https://example.com)',
    );
    expect(rules.isAllowed('/public')).toBe(true);
    expect(rules.isAllowed('/private/x')).toBe(false);
  });

  it('groups consecutive user-agent lines', () => {
    const rules = parseRobots('User-agent: a\nUser-agent: docseekbot\nDisallow: /x\n', 'DocSeekBot');
    expect(rules.isAllowed('/x')).toBe(false);
  });

  it('prefers the longest match and Allow on ties', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /a\nAllow: /a/b\nAllow: /c\nDisallow: /c\n', 'bot');
    expect(rules.isAllowed('/a/x')).toBe(false);
    expect(rules.isAllowed('/a/b/c')).toBe(true);
    expect(rules.isAllowed('/c')).toBe(true);
  });

  it('supports * and $ wildcards', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /*.pdf$\nDisallow: /tmp*/cache\n', 'bot');
    expect(rules.isAllowed('/docs/file.pdf')).toBe(false);
    expect(rules.isAllowed('/docs/file.pdf?x=1')).toBe(true);
    expect(rules.isAllowed('/tmp123/cache/a')).toBe(false);
  });

  it('ignores comments, empty Disallow and reads Crawl-delay', () => {
    const rules = parseRobots('# hi\nUser-agent: * # all\nDisallow:\nCrawl-delay: 2\n', 'bot');
    expect(rules.isAllowed('/anything')).toBe(true);
    expect(rules.crawlDelaySeconds).toBe(2);
  });

  it('allows everything when there is no matching group', () => {
    expect(parseRobots('User-agent: other\nDisallow: /\n', 'bot').isAllowed('/x')).toBe(true);
  });
});
