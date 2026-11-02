import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SourceDocument } from '@docseek/engine';
import { readCorpus, writeCorpus } from '../src/corpus.js';

const docs: SourceDocument[] = [
  { id: 'a', url: 'https://x/a', source: 's', title: 'A', breadcrumbs: [], body: 'línea con "comillas"\ny salto' },
  { id: 'b', url: 'https://x/b', source: 's', title: 'B', breadcrumbs: ['A'], body: '' },
];

let dir: string | undefined;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe('corpus', () => {
  it('round-trips documents through gzip JSONL and writes metadata', async () => {
    dir = await mkdtemp(join(tmpdir(), 'corpus-'));
    await writeCorpus(dir, 's', docs, { crawledAt: 'now' });
    const read: SourceDocument[] = [];
    for await (const doc of readCorpus(dir)) read.push(doc);
    expect(read).toEqual(docs);
    expect(JSON.parse(await readFile(join(dir, 's.meta.json'), 'utf8'))).toEqual({
      source: 's',
      documents: 2,
      crawledAt: 'now',
    });
  });

  it('produces byte-identical output for identical input', async () => {
    dir = await mkdtemp(join(tmpdir(), 'corpus-'));
    const first = await readFile(await writeCorpus(dir, 's', docs, {}));
    const second = await readFile(await writeCorpus(dir, 's', docs, {}));
    expect(first.equals(second)).toBe(true);
  });
});
