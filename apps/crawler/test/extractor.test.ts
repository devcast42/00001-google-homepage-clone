import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractNodeDocs } from '../src/extractors/nodejs.js';

const html = readFileSync(new URL('fixtures/node-page.html', import.meta.url), 'utf8');
const page = extractNodeDocs(html, 'https://nodejs.org/api/fs.html', 'nodejs');
const byTitle = (title: string) => page.documents.find((doc) => doc.title === title);

describe('extractNodeDocs', () => {
  it('creates one document per section with a deep link', () => {
    const doc = byTitle('fs.readFile(path[, options], callback)');
    expect(doc).toMatchObject({
      id: 'https://nodejs.org/api/fs.html#fsreadfilepath-options-callback',
      url: 'https://nodejs.org/api/fs.html#fsreadfilepath-options-callback',
      source: 'nodejs',
      breadcrumbs: ['File system', 'Callback API'],
    });
  });

  it('rebuilds the hierarchy from heading levels', () => {
    expect(byTitle('File descriptors')?.breadcrumbs).toEqual([
      'File system',
      'Callback API',
      'fs.readFile(path[, options], callback)',
    ]);
    expect(byTitle('Synchronous API')?.breadcrumbs).toEqual(['File system']);
  });

  it('keeps text from blocks separated and drops metadata, changelog and the CJS variant', () => {
    const body = byTitle('fs.readFile(path[, options], callback)')!.body;
    expect(body).toBe(
      "path filename callback Function Asynchronously reads the entire contents of a file. import { readFile } from 'node:fs';",
    );
    expect(byTitle('File system')!.body).toBe(
      'The node:fs module enables interacting with the file system. Second paragraph.',
    );
  });

  it('skips empty intermediate sections but keeps them in breadcrumbs', () => {
    expect(byTitle('Callback API')).toBeUndefined();
  });

  it('makes duplicated anchors unique', () => {
    const ids = page.documents.filter((doc) => doc.title === "Event: 'close'").map((doc) => doc.id);
    expect(ids).toEqual([
      'https://nodejs.org/api/fs.html#event-close',
      'https://nodejs.org/api/fs.html#event-close_2',
    ]);
  });

  it('returns absolute, normalized links', () => {
    expect(page.links).toContain('https://nodejs.org/api/path.html');
    expect(page.links).toContain('https://example.com/out');
    expect(page.links).toContain('https://nodejs.org/api/fs.html');
    expect(page.links.every((link) => !link.includes('#'))).toBe(true);
  });
});
