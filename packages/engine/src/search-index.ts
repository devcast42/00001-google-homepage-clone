import { boundedLevenshtein, maxEditsFor } from './levenshtein.js';
import { highlight, snippet } from './snippet.js';
import { tokenize, type Token } from './tokenizer.js';
import {
  FIELDS,
  type IndexStats,
  type SearchHit,
  type SearchOptions,
  type SearchResult,
  type SourceDocument,
  type Suggestion,
} from './types.js';

export const INDEX_FORMAT_VERSION = 1;
const STRIDE = FIELDS.length + 1;

export interface SerializedIndex {
  readonly version: number;
  readonly builtAt: string;
  readonly fields: readonly string[];
  readonly documents: readonly SourceDocument[];
  readonly fieldLengths: readonly (readonly number[])[];
  readonly terms: readonly string[];
  readonly postings: readonly (readonly number[])[];
}

/**
 * Parámetros de BM25F. Los pesos por campo hacen que una coincidencia en el título
 * valga más que varias en el cuerpo; `b` controla cuánto se penaliza la longitud del campo.
 * Valores elegidos con el conjunto de consultas de `apps/api/bench/queries.json`.
 */
export const RANKING = {
  k1: 1.2,
  weights: [5, 1.5, 1] as const,
  b: [0.4, 0.5, 0.75] as const,
  /** Peso de los términos derivados (partes de camelCase) respecto a la palabra completa. */
  derivedWeight: 0.35,
  /** Peso de una corrección a distancia 1 y 2. */
  fuzzyWeights: [1, 0.7, 0.45] as const,
  prefixWeight: 0.6,
  maxPrefixExpansions: 12,
  maxFuzzyCandidates: 3,
} as const;

interface WeightedTerm {
  readonly termIndex: number;
  readonly weight: number;
}

interface QueryGroup {
  /** Fragmento de la consulta original al que corresponde el grupo. */
  readonly start: number;
  readonly end: number;
  readonly terms: WeightedTerm[];
  /** Término usado como corrección, si la palabra no existía. */
  correction?: string;
}

/** Índice de búsqueda en memoria, inmutable y listo para consultar. */
export class SearchIndex {
  readonly #documents: readonly SourceDocument[];
  readonly #fieldLengths: readonly (readonly number[])[];
  readonly #averageLengths: readonly number[];
  readonly #terms: readonly string[];
  readonly #termIndex: ReadonlyMap<string, number>;
  readonly #postings: readonly Int32Array[];
  readonly #builtAt: string;
  #termsByLength: Map<number, number[]> | undefined;

  private constructor(data: SerializedIndex) {
    this.#documents = data.documents;
    this.#fieldLengths = data.fieldLengths;
    this.#averageLengths = data.fieldLengths.map(
      (lengths) => lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length),
    );
    this.#terms = data.terms;
    this.#termIndex = new Map(data.terms.map((term, index) => [term, index]));
    this.#postings = data.postings.map((encoded) => {
      const decoded = Int32Array.from(encoded);
      for (let i = STRIDE; i < decoded.length; i += STRIDE) decoded[i]! += decoded[i - STRIDE]!;
      return decoded;
    });
    this.#builtAt = data.builtAt;
  }

  /** Carga un índice serializado, validando su formato. */
  static fromJSON(data: unknown): SearchIndex {
    assertSerializedIndex(data);
    return new SearchIndex(data);
  }

  get size(): number {
    return this.#documents.length;
  }

  stats(): IndexStats {
    const sources: Record<string, number> = {};
    for (const { source } of this.#documents) sources[source] = (sources[source] ?? 0) + 1;
    return {
      documents: this.#documents.length,
      terms: this.#terms.length,
      sources,
      builtAt: this.#builtAt,
    };
  }

  search(query: string, options: SearchOptions = {}): SearchResult {
    const { limit = 10, offset = 0, prefix = false, sources } = options;
    const groups = this.#parseQuery(query, prefix);
    if (groups.length === 0) return { total: 0, hits: [] };

    const allowedSources = sources && sources.length > 0 ? new Set(sources) : undefined;
    const scores = new Map<number, number>();
    const matchedGroups = new Map<number, number>();

    for (const group of groups) {
      const groupScores = new Map<number, number>();
      for (const { termIndex, weight } of group.terms) {
        const postings = this.#postings[termIndex]!;
        const idf = this.#idf(postings.length / STRIDE);
        for (let i = 0; i < postings.length; i += STRIDE) {
          const doc = postings[i]!;
          if (allowedSources && !allowedSources.has(this.#documents[doc]!.source)) continue;
          const score = weight * idf * this.#saturatedFrequency(postings, i, doc);
          groupScores.set(doc, (groupScores.get(doc) ?? 0) + score);
        }
      }
      for (const [doc, score] of groupScores) {
        scores.set(doc, (scores.get(doc) ?? 0) + score);
        matchedGroups.set(doc, (matchedGroups.get(doc) ?? 0) + 1);
      }
    }

    // "AND suave": un documento que contiene todas las palabras de la consulta va por
    // delante de uno que solo contiene algunas, aunque estas aparezcan muchas veces.
    const ranked = [...scores].map(([doc, score]) => {
      const coverage = matchedGroups.get(doc)! / groups.length;
      return { doc, score: score * coverage * coverage };
    });
    ranked.sort(
      (a, b) =>
        b.score - a.score ||
        this.#documents[a.doc]!.title.length - this.#documents[b.doc]!.title.length ||
        a.doc - b.doc,
    );

    const highlightTerms = new Set(
      groups.flatMap((group) => group.terms.map(({ termIndex }) => this.#terms[termIndex]!)),
    );
    const hits = ranked.slice(offset, offset + limit).map(({ doc, score }): SearchHit => {
      const document = this.#documents[doc]!;
      return {
        id: document.id,
        url: document.url,
        source: document.source,
        breadcrumbs: document.breadcrumbs,
        title: highlight(document.title, highlightTerms),
        snippet: snippet(document.body, highlightTerms),
        score: Math.round(score * 1000) / 1000,
      };
    });

    const didYouMean = buildCorrection(query, groups);
    return didYouMean ? { total: ranked.length, hits, didYouMean } : { total: ranked.length, hits };
  }

  /** Sugerencias para autocompletar: las secciones que mejor encajan con lo escrito hasta ahora. */
  suggest(query: string, limit = 8): Suggestion[] {
    const seen = new Set<string>();
    const suggestions: Suggestion[] = [];
    for (const hit of this.search(query, { prefix: true, limit: limit * 2 }).hits) {
      const key = `${hit.title.text}\u0000${hit.breadcrumbs.join('>')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: hit.id,
        url: hit.url,
        title: hit.title.text,
        breadcrumbs: hit.breadcrumbs,
      });
      if (suggestions.length === limit) break;
    }
    return suggestions;
  }

  #idf(documentFrequency: number): number {
    const n = this.#documents.length;
    return Math.log(1 + (n - documentFrequency + 0.5) / (documentFrequency + 0.5));
  }

  /** Frecuencia combinada de BM25F: suma ponderada de los campos y saturación con k1. */
  #saturatedFrequency(postings: Int32Array, offset: number, doc: number): number {
    let weighted = 0;
    for (let field = 0; field < FIELDS.length; field++) {
      const tf = postings[offset + 1 + field]!;
      if (tf === 0) continue;
      const length = this.#fieldLengths[field]![doc]!;
      const average = this.#averageLengths[field]! || 1;
      const b = RANKING.b[field]!;
      weighted += (RANKING.weights[field]! * tf) / (1 - b + (b * length) / average);
    }
    return (weighted * (RANKING.k1 + 1)) / (RANKING.k1 + weighted);
  }

  #parseQuery(query: string, prefix: boolean): QueryGroup[] {
    const groups: { primary: Token; derived: Token[] }[] = [];
    for (const token of tokenize(query.slice(0, 500))) {
      const last = groups.at(-1);
      if (token.primary || !last) groups.push({ primary: token, derived: [] });
      else last.derived.push(token);
    }

    const parsed = groups.map(({ primary, derived }, index): QueryGroup => {
      const terms = new Map<number, number>();
      const add = (termIndex: number | undefined, weight: number) => {
        if (termIndex !== undefined) terms.set(termIndex, Math.max(terms.get(termIndex) ?? 0, weight));
      };

      const exact = this.#termIndex.get(primary.term);
      add(exact, 1);
      for (const token of derived) add(this.#termIndex.get(token.term), RANKING.derivedWeight);

      const expansions =
        prefix && index === groups.length - 1 ? this.#prefixExpansions(primary.term) : [];
      for (const termIndex of expansions) add(termIndex, RANKING.prefixWeight);

      const group: QueryGroup = { start: primary.start, end: primary.end, terms: [] };
      if (exact === undefined && expansions.length === 0) {
        const candidates = this.#fuzzyCandidates(primary.term);
        for (const { termIndex, distance } of candidates) add(termIndex, RANKING.fuzzyWeights[distance]!);
        if (candidates[0]) group.correction = this.#terms[candidates[0].termIndex]!;
      }

      group.terms.push(...[...terms].map(([termIndex, weight]) => ({ termIndex, weight })));
      return group;
    });

    return parsed;
  }

  #documentFrequency(termIndex: number): number {
    return this.#postings[termIndex]!.length / STRIDE;
  }

  #prefixExpansions(prefix: string): number[] {
    if (prefix.length < 2) return [];
    let low = 0;
    let high = this.#terms.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.#terms[mid]! < prefix) low = mid + 1;
      else high = mid;
    }
    const matches: number[] = [];
    for (let i = low; i < this.#terms.length && this.#terms[i]!.startsWith(prefix); i++) {
      matches.push(i);
    }
    return matches
      .sort((a, b) => this.#documentFrequency(b) - this.#documentFrequency(a))
      .slice(0, RANKING.maxPrefixExpansions);
  }

  #fuzzyCandidates(term: string): { termIndex: number; distance: number }[] {
    const maxEdits = maxEditsFor(term);
    if (maxEdits === 0) return [];

    this.#termsByLength ??= this.#groupTermsByLength();
    const candidates: { termIndex: number; distance: number }[] = [];
    for (let length = term.length - maxEdits; length <= term.length + maxEdits; length++) {
      for (const termIndex of this.#termsByLength.get(length) ?? []) {
        const distance = boundedLevenshtein(term, this.#terms[termIndex]!, maxEdits);
        if (distance <= maxEdits) candidates.push({ termIndex, distance });
      }
    }
    return candidates
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          this.#documentFrequency(b.termIndex) - this.#documentFrequency(a.termIndex),
      )
      .slice(0, RANKING.maxFuzzyCandidates);
  }

  #groupTermsByLength(): Map<number, number[]> {
    const byLength = new Map<number, number[]>();
    this.#terms.forEach((term, index) => {
      if (term.includes('.')) return;
      const list = byLength.get(term.length);
      if (list) list.push(index);
      else byLength.set(term.length, [index]);
    });
    return byLength;
  }
}

function buildCorrection(query: string, groups: readonly QueryGroup[]): string | undefined {
  const corrected = groups.filter((group) => group.correction !== undefined);
  if (corrected.length === 0) return undefined;
  let result = '';
  let cursor = 0;
  for (const group of corrected) {
    result += query.slice(cursor, group.start) + group.correction;
    cursor = group.end;
  }
  return (result + query.slice(cursor)).trim();
}

function assertSerializedIndex(data: unknown): asserts data is SerializedIndex {
  if (typeof data !== 'object' || data === null) throw new TypeError('Índice inválido: no es un objeto');
  const index = data as Partial<SerializedIndex>;
  if (index.version !== INDEX_FORMAT_VERSION) {
    throw new TypeError(
      `Versión de índice no soportada: ${String(index.version)} (se esperaba ${INDEX_FORMAT_VERSION}). Vuelve a generarlo con \`npm run index\`.`,
    );
  }
  if (
    !Array.isArray(index.documents) ||
    !Array.isArray(index.terms) ||
    !Array.isArray(index.postings) ||
    !Array.isArray(index.fieldLengths) ||
    index.terms.length !== index.postings.length ||
    index.fieldLengths.length !== FIELDS.length ||
    index.fieldLengths.some((lengths) => lengths.length !== index.documents!.length)
  ) {
    throw new TypeError('Índice inválido: estructura inconsistente');
  }
}
