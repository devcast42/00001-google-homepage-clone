import { stem } from './stemmer.js';
import { STOPWORDS } from './stopwords.js';

/** Un término del índice junto con su posición en el texto original. */
export interface Token {
  /** Término normalizado tal y como se guarda en el índice. */
  readonly term: string;
  /** Desplazamiento (en unidades UTF-16) del inicio del fragmento en el texto original. */
  readonly start: number;
  /** Desplazamiento del final (exclusivo). */
  readonly end: number;
  /**
   * `true` para el término que representa la palabra completa tal y como la escribió
   * el usuario; `false` para los términos derivados (partes de camelCase o de
   * identificadores con puntos). Los derivados mejoran el recall pero puntúan menos.
   */
  readonly primary: boolean;
}

// Una "palabra" es una secuencia alfanumérica que puede contener `_`, `$` y puntos
// internos, para capturar identificadores como `fs.readFile` o `process.env.NODE_ENV`.
const WORD = /[\p{L}\p{N}_$]+(?:\.[\p{L}\p{N}_$]+)*/gu;
// Subpalabras de camelCase, PascalCase, acrónimos y snake_case:
// readFile → read|File, HTTPServer → HTTP|Server, NODE_ENV → NODE|ENV.
const SUBWORD = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+|\p{N}+/gu;
const MAX_TERM_LENGTH = 64;

/** Minúsculas y sin diacríticos, para que "Café" y "cafe" coincidan. */
export function normalize(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
}

function normalizeWord(word: string): string {
  const normalized = normalize(word);
  if (normalized.length > MAX_TERM_LENGTH) return normalized.slice(0, MAX_TERM_LENGTH);
  return normalized;
}

function emitSimple(word: string, start: number, primary: boolean, out: Token[]): void {
  const normalized = normalizeWord(word.replaceAll('$', ''));
  if (normalized.length === 0) return;
  if (primary && STOPWORDS.has(normalized)) return;
  out.push({ term: stem(normalized), start, end: start + word.length, primary });
}

function emitIdentifierPart(part: string, start: number, primary: boolean, out: Token[]): void {
  emitSimple(part, start, primary, out);

  const pieces = [...part.matchAll(SUBWORD)];
  if (pieces.length < 2) return;

  for (const piece of pieces) {
    if (piece[0].length > 1) emitSimple(piece[0], start + piece.index, false, out);
  }
}

/**
 * Convierte texto en términos indexables, conservando las posiciones para poder
 * resaltar coincidencias después.
 *
 * Para cada palabra emite:
 * - el identificador completo si tiene puntos (`fs.readfile`), sin stemming;
 * - cada segmento separado por puntos (`fs`, `readfile`);
 * - las partes de camelCase y snake_case de cada segmento (`read`, `file`).
 *
 * Así una búsqueda de "readFile", "read file" o "fs.readFile" encuentra la misma sección.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  for (const match of text.matchAll(WORD)) {
    const word = match[0];
    const start = match.index;

    if (!word.includes('.')) {
      emitIdentifierPart(word, start, true, tokens);
      continue;
    }

    const compound = normalizeWord(word);
    tokens.push({ term: compound, start, end: start + word.length, primary: true });

    let offset = start;
    for (const segment of word.split('.')) {
      emitIdentifierPart(segment, offset, false, tokens);
      offset += segment.length + 1;
    }
  }

  return tokens;
}
