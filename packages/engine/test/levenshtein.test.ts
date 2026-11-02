import { describe, expect, it } from 'vitest';
import { boundedLevenshtein } from '../src/index.js';

describe('boundedLevenshtein', () => {
  it.each([
    ['callback', 'callback', 0],
    ['callbak', 'callback', 1],
    ['calback', 'callback', 1],
    ['clalback', 'callback', 2],
    ['kitten', 'sitting', 3],
  ])('distance(%s, %s) = %i', (a, b, expected) => {
    expect(boundedLevenshtein(a, b, 5)).toBe(expected);
  });

  it('returns max + 1 as soon as the bound is exceeded', () => {
    expect(boundedLevenshtein('kitten', 'sitting', 1)).toBe(2);
    expect(boundedLevenshtein('a', 'abcdef', 2)).toBe(3);
  });
});
