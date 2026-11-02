/**
 * Stemmer ligero para inglés, basado en el "S-stemmer" de Harman (1991).
 *
 * Solo normaliza plurales. Es una decisión deliberada: los stemmers agresivos
 * (Porter, Snowball) destrozan identificadores de código ("process" → "process",
 * pero "readable" → "readabl", "writer" → "writer"/"write" según el caso) y hacen
 * que los resultados sean difíciles de explicar. Ver docs/adr/0002-tokenizacion.md.
 */
export function stem(word: string): string {
  if (word.length <= 3) return word;

  if (word.endsWith('ies') && word.length > 4 && !word.endsWith('eies') && !word.endsWith('aies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (/(?:x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('es') && !word.endsWith('aes') && !word.endsWith('ees') && !word.endsWith('oes')) {
    return word.slice(0, -1);
  }
  if (word.endsWith('s') && !/(?:ss|us|is|ys)$/.test(word)) return word.slice(0, -1);

  return word;
}
