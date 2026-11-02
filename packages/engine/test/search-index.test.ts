import { describe, expect, it } from 'vitest';
import { IndexBuilder, SearchIndex } from '../src/index.js';
import { documents } from './fixtures.js';

const index = new IndexBuilder().addAll(documents).build();
const ids = (query: string, options = {}) => index.search(query, options).hits.map((hit) => hit.id);

describe('SearchIndex.search', () => {
  it('ranks an exact API name first', () => {
    expect(ids('fs.readFile')[0]).toBe('fs-readfile');
    expect(ids('readFile')[0]).toBe('fs-readfile');
  });

  it('matches natural language against camelCase identifiers', () => {
    expect(ids('read file')[0]).toBe('fs-readfile');
  });

  it('prefers documents that contain every query word', () => {
    expect(ids('write file')[0]).toBe('fs-writefile');
    expect(ids('directory files')[0]).toBe('fs-readdir');
  });

  it('weights title matches above body matches', () => {
    expect(ids('process')[0]).toBe('process-env');
  });

  it('tolerates typos and suggests a correction', () => {
    const result = index.search('lisener');
    expect(result.hits[0]?.id).toBe('events-on');
    expect(result.didYouMean).toBe('listener');
  });

  it('keeps the rest of the query when building the correction', () => {
    expect(index.search('http creatServer').didYouMean).toBe('http createserver');
  });

  it('does not correct words that exist', () => {
    expect(index.search('listener').didYouMean).toBeUndefined();
  });

  it('expands the last word as a prefix when asked', () => {
    expect(ids('rea')).toEqual([]);
    expect(ids('rea', { prefix: true })).toEqual(expect.arrayContaining(['fs-readdir', 'fs-readfile']));
    expect(ids('fs.rea', { prefix: true }).slice(0, 2).sort()).toEqual(['fs-readdir', 'fs-readfile']);
  });

  it('joins adjacent words that form an indexed term', () => {
    expect(ids('base name')[0]).toBe('path-basename');
  });

  it('filters by source', () => {
    expect(ids('process', { sources: ['mdn'] })).toEqual(['mdn-fetch']);
  });

  it('paginates and reports the total', () => {
    const page1 = index.search('file', { limit: 2 });
    const page2 = index.search('file', { limit: 2, offset: 2 });
    expect(page1.total).toBe(3);
    expect(page1.hits).toHaveLength(2);
    expect(page2.hits).toHaveLength(1);
    expect(new Set([...page1.hits, ...page2.hits].map((hit) => hit.id)).size).toBe(3);
  });

  it('returns nothing for empty or stopword-only queries', () => {
    expect(index.search('').total).toBe(0);
    expect(index.search('   ').total).toBe(0);
    expect(index.search('the of and').total).toBe(0);
  });

  it('highlights matches in the title and snippet', () => {
    const marked = (query: string) => {
      const { title } = index.search(query).hits[0]!;
      return title.highlights.map(([start, end]) => title.text.slice(start, end));
    };
    expect(marked('readFile')).toEqual(['readFile']);
    expect(marked('fs.readFile')).toEqual(['fs.readFile']);
  });

  it('is deterministic for equal scores', () => {
    expect(ids('callback')).toEqual(ids('callback'));
  });
});

describe('SearchIndex.suggest', () => {
  it('completes partial input', () => {
    expect(index.suggest('emitter.o').map((suggestion) => suggestion.title)).toContain(
      'emitter.on(eventName, listener)',
    );
  });

  it('respects the limit', () => {
    expect(index.suggest('f', 2).length).toBeLessThanOrEqual(2);
  });
});

describe('SearchIndex.withRanking', () => {
  it('changes the ranking without touching the original index', () => {
    const titleOnly = index.withRanking({ weights: [1, 0, 0] });
    expect(titleOnly.search('contents').total).toBe(0);
    expect(index.search('contents').total).toBeGreaterThan(0);
    expect(titleOnly.ranking.weights).toEqual([1, 0, 0]);
    expect(titleOnly.ranking.k1).toBe(index.ranking.k1);
  });
});

describe('serialization', () => {
  it('round-trips through JSON without changing results', () => {
    const builder = new IndexBuilder().addAll(documents);
    const restored = SearchIndex.fromJSON(JSON.parse(JSON.stringify(builder.serialize())));
    expect(restored.search('read file')).toEqual(index.search('read file'));
    expect(restored.stats()).toMatchObject({ documents: documents.length, sources: { nodejs: 7, mdn: 1 } });
  });

  it('rejects unknown versions and malformed data', () => {
    const data = new IndexBuilder().addAll(documents).serialize();
    expect(() => SearchIndex.fromJSON({ ...data, version: 99 })).toThrow(/Versión/);
    expect(() => SearchIndex.fromJSON({ ...data, terms: [] })).toThrow(/inconsistente/);
    expect(() => SearchIndex.fromJSON(null)).toThrow();
  });

  it('rejects duplicate documents', () => {
    expect(() => new IndexBuilder().add(documents[0]!).add(documents[0]!)).toThrow(/duplicado/);
  });
});
