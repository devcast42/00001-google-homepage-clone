import { describe, expect, it } from 'vitest';
import { normalize, stem, tokenize } from '../src/index.js';

const terms = (text: string) => tokenize(text).map((token) => token.term);

describe('tokenize', () => {
  it('lowercases, strips diacritics and removes standalone stopwords', () => {
    expect(terms('How to read THE Café')).toEqual(['read', 'cafe']);
  });

  it('splits camelCase identifiers and keeps the full word', () => {
    expect(terms('readFile')).toEqual(['readfile', 'read', 'file']);
    expect(terms('HTTPServer')).toEqual(['httpserver', 'http', 'server']);
    expect(terms('NODE_ENV')).toEqual(['node_env', 'node', 'env']);
  });

  it('keeps dotted identifiers as a compound term plus their parts', () => {
    expect(terms('fs.readFile')).toEqual(['fs.readfile', 'fs', 'readfile', 'read', 'file']);
  });

  it('keeps stopwords that are part of an identifier', () => {
    expect(terms('emitter.on')).toEqual(['emitter.on', 'emitter', 'on']);
  });

  it('marks only the whole word as primary', () => {
    expect(tokenize('readFile').map((token) => token.primary)).toEqual([true, false, false]);
  });

  it('reports offsets into the original text', () => {
    const text = 'call fs.readFile now';
    for (const token of tokenize(text)) {
      expect(normalize(text.slice(token.start, token.end))).toContain(token.term.slice(0, 2));
    }
    const read = tokenize(text).find((token) => token.term === 'read')!;
    expect(text.slice(read.start, read.end)).toBe('read');
  });

  it('ignores punctuation and handles empty input', () => {
    expect(terms('')).toEqual([]);
    expect(terms('(err, data) => {}')).toEqual(['err', 'data']);
  });
});

describe('stem', () => {
  it.each([
    ['files', 'file'],
    ['callbacks', 'callback'],
    ['directories', 'directory'],
    ['classes', 'class'],
    ['matches', 'match'],
    ['uses', 'use'],
    ['process', 'process'],
    ['status', 'status'],
    ['options', 'option'],
    ['fs', 'fs'],
  ])('%s → %s', (word, expected) => {
    expect(stem(word)).toBe(expected);
  });
});
