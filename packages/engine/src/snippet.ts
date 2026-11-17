import { tokenize } from './tokenizer.js';
import type { Highlighted } from './types.js';

const ELLIPSIS = '…';

function mergeRanges(ranges: [number, number][]): [number, number][] {
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

/** Resalta todas las coincidencias en un texto corto (por ejemplo, un título). */
export function highlight(text: string, terms: ReadonlySet<string>): Highlighted {
  const ranges = tokenize(text)
    .filter((token) => terms.has(token.term))
    .map((token): [number, number] => [token.start, token.end]);
  return { text, highlights: mergeRanges(ranges) };
}

/**
 * Elige el fragmento de `maxLength` caracteres que contiene más términos distintos
 * de la consulta y devuelve los rangos a resaltar relativos a ese fragmento.
 *
 * Devolver rangos en vez de HTML deja el escapado en manos del cliente y evita
 * cualquier posibilidad de inyectar HTML desde el contenido indexado.
 */
export function snippet(text: string, terms: ReadonlySet<string>, maxLength = 220): Highlighted {
  if (text.length <= maxLength) return highlight(text, terms);

  const matches = tokenize(text).filter((token) => terms.has(token.term));
  if (matches.length === 0) return truncate(text, 0, maxLength, []);

  let bestStart = 0;
  let bestScore = -1;
  let right = 0;
  const counts = new Map<string, number>();

  for (let left = 0; left < matches.length; left++) {
    const windowEnd = matches[left]!.start + maxLength * 0.8;
    while (right < matches.length && matches[right]!.end <= windowEnd) {
      const term = matches[right]!.term;
      counts.set(term, (counts.get(term) ?? 0) + 1);
      right++;
    }
    // Prioriza la variedad de términos; a igualdad, la cantidad de coincidencias.
    const score = counts.size * 1000 + (right - left);
    if (score > bestScore) {
      bestScore = score;
      bestStart = left;
    }
    const term = matches[left]!.term;
    const count = counts.get(term)!;
    if (count === 1) counts.delete(term);
    else counts.set(term, count - 1);
  }

  const first = matches[bestStart]!;
  return truncate(
    text,
    Math.max(0, first.start - Math.round(maxLength * 0.15)),
    maxLength,
    matches.map((token): [number, number] => [token.start, token.end]),
  );
}

function truncate(
  text: string,
  roughStart: number,
  maxLength: number,
  ranges: [number, number][],
): Highlighted {
  let start = roughStart;
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space === -1 || space - start > 20 ? start : space + 1;
  }
  let end = Math.min(text.length, start + maxLength);
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > start + maxLength / 2) end = space;
  }

  const prefix = start > 0 ? ELLIPSIS : '';
  const suffix = end < text.length ? ELLIPSIS : '';
  const shift = prefix.length - start;
  const highlights = mergeRanges(
    ranges
      .filter(([s, e]) => s >= start && e <= end)
      .map(([s, e]): [number, number] => [s + shift, e + shift]),
  );

  return { text: prefix + text.slice(start, end) + suffix, highlights };
}
