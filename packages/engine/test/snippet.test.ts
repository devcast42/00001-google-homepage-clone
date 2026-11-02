import { describe, expect, it } from 'vitest';
import { highlight, snippet } from '../src/index.js';

const marked = ({ text, highlights }: { text: string; highlights: readonly (readonly [number, number])[] }) =>
  highlights.map(([start, end]) => text.slice(start, end));

describe('highlight', () => {
  it('returns ranges for every matching token', () => {
    expect(marked(highlight('Reads the file. Files are read.', new Set(['file', 'read'])))).toEqual([
      'Reads',
      'file',
      'Files',
      'read',
    ]);
  });

  it('merges overlapping ranges from compound identifiers', () => {
    const result = highlight('use fs.readFile here', new Set(['fs.readfile', 'read', 'file']));
    expect(marked(result)).toEqual(['fs.readFile']);
  });
});

describe('snippet', () => {
  const filler = 'lorem ipsum dolor sit amet '.repeat(30);
  const text = `${filler}the stream emits a close event when done ${filler}`;

  it('centres the snippet on the best matching window', () => {
    const result = snippet(text, new Set(['stream', 'close']), 120);
    expect(result.text.startsWith('…')).toBe(true);
    expect(result.text.endsWith('…')).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(122);
    expect(marked(result)).toEqual(['stream', 'close']);
  });

  it('falls back to the start of the text when nothing matches', () => {
    const result = snippet(text, new Set(['missing']), 50);
    expect(result.text.startsWith('lorem')).toBe(true);
    expect(result.highlights).toEqual([]);
  });

  it('returns short texts untouched', () => {
    expect(snippet('short text', new Set(['text']))).toEqual({ text: 'short text', highlights: [[6, 10]] });
  });
});
