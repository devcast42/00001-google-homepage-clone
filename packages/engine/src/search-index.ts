import { boundedLevenshtein, maxEditsFor } from './levenshtein.js';
import { highlight, snippet } from './snippet.js';
import { normalize, tokenize, type Token } from './tokenizer.js';
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
/** Ver `TF_PRIMARY` en builder.ts: las frecuencias se guardan en medias unidades. */
const TF_SCALE = 2;
const TITLE_FIELD = 1;

export interface SerializedIndex {
  readonly version: number;
  readonly builtAt: string;
  readonly fields: readonly string[];
  readonly documents: readonly SourceDocument[];
  readonly fieldLengths: readonly (readonly number[])[];
  readonly terms: readonly string[];
  readonly postings: readonly (readonly number[])[];
  /** Forma habitual de los términos con mayúsculas (`readfile` → `readFile`). */
  readonly displayForms?: Readonly<Record<string, string>>;
}

/**
 * Parámetros del ranking (BM25F más ajustes propios). Los pesos por campo hacen que una
 * coincidencia en el título valga más que varias en el cuerpo; `b` controla cuánto se
 * penaliza la longitud de cada campo. Los valores por defecto se eligieron midiendo la
 * calidad con `npm run bench:relevance` (ver docs/adr/0004-ranking.md y bench/).
 */
export interface RankingConfig {
  readonly k1: number;
  /** Peso de cada campo, en el orden de `FIELDS`. */
  readonly weights: readonly [number, number, number];
  /** Normalización por longitud de cada campo (0 = ninguna, 1 = completa). */
  readonly b: readonly [number, number, number];
  /** Peso de los términos derivados (partes de camelCase) respecto a la palabra completa. */
  readonly derivedWeight: number;
  /** Peso de una corrección a distancia 0, 1 y 2. */
  readonly fuzzyWeights: readonly [number, number, number];
  readonly prefixWeight: number;
  readonly maxPrefixExpansions: number;
  /** Con todas las palabras en el título, la puntuación se multiplica por 1 + titleBonus. */
  readonly titleBonus: number;
  /** Penalización por cada nivel de profundidad de la sección (0 = ninguna). */
  readonly depthPenalty: number;
  /** Peso del término formado al unir dos palabras contiguas ("base name" → `basename`). */
  readonly joinedWeight: number;
}

export const DEFAULT_RANKING: RankingConfig = {
  k1: 1.2,
  weights: [2, 0, 1],
  b: [0.4, 0.5, 0.3],
  derivedWeight: 0.35,
  fuzzyWeights: [1, 0.7, 0.45],
  prefixWeight: 0.6,
  maxPrefixExpansions: 12,
  titleBonus: 1,
  depthPenalty: 0.1,
  joinedWeight: 0.2,
};

export interface SearchIndexOptions {
  /** Sobrescribe parámetros del ranking; útil para experimentar sin reindexar. */
  readonly ranking?: Partial<RankingConfig>;
}

interface WeightedTerm {
  readonly termIndex: number;
  readonly weight: number;
  /**
   * Las alternativas (expansiones de prefijo y correcciones) compiten entre sí: de
   * todas las de un grupo solo cuenta la que mejor puntúa en cada documento. Si se
   * sumaran, una sección que menciona diez funciones `fs.read*` ganaría a `fs.readFile`.
   */
  readonly alternative: boolean;
  /** IDF fijo para expansiones de prefijo; si no, se usa el del propio término. */
  readonly idf?: number;
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
  readonly #displayForms: Readonly<Record<string, string>>;
  readonly #ranking: RankingConfig;
  #termsByLength: Map<number, number[]> | undefined;

  private constructor(source: SerializedIndex | SearchIndex, ranking: RankingConfig) {
    this.#ranking = ranking;
    if (source instanceof SearchIndex) {
      this.#documents = source.#documents;
      this.#fieldLengths = source.#fieldLengths;
      this.#averageLengths = source.#averageLengths;
      this.#terms = source.#terms;
      this.#termIndex = source.#termIndex;
      this.#postings = source.#postings;
      this.#builtAt = source.#builtAt;
      this.#displayForms = source.#displayForms;
      this.#termsByLength = source.#termsByLength;
      return;
    }
    this.#documents = source.documents;
    this.#fieldLengths = source.fieldLengths;
    this.#averageLengths = source.fieldLengths.map(
      (lengths) => lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length),
    );
    this.#terms = source.terms;
    this.#termIndex = new Map(source.terms.map((term, index) => [term, index]));
    this.#postings = source.postings.map((encoded) => {
      const decoded = Int32Array.from(encoded);
      for (let i = STRIDE; i < decoded.length; i += STRIDE) decoded[i]! += decoded[i - STRIDE]!;
      return decoded;
    });
    this.#builtAt = source.builtAt;
    this.#displayForms = source.displayForms ?? {};
  }

  /** Carga un índice serializado, validando su formato. */
  static fromJSON(data: unknown, options: SearchIndexOptions = {}): SearchIndex {
    assertSerializedIndex(data);
    return new SearchIndex(data, { ...DEFAULT_RANKING, ...options.ranking });
  }

  /** Mismo índice con otros parámetros de ranking, sin volver a decodificar nada. */
  withRanking(ranking: Partial<RankingConfig>): SearchIndex {
    return new SearchIndex(this, { ...this.#ranking, ...ranking });
  }

  get ranking(): RankingConfig {
    return this.#ranking;
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
    const titleGroups = new Map<number, number>();

    for (const group of groups) {
      const base = new Map<number, number>();
      const best = new Map<number, number>();
      const inTitle = new Set<number>();
      for (const { termIndex, weight, alternative, idf: fixedIdf } of group.terms) {
        const postings = this.#postings[termIndex]!;
        const idf = fixedIdf ?? this.#idf(postings.length / STRIDE);
        for (let i = 0; i < postings.length; i += STRIDE) {
          const doc = postings[i]!;
          if (allowedSources && !allowedSources.has(this.#documents[doc]!.source)) continue;
          const score = weight * idf * this.#saturatedFrequency(postings, i, doc);
          if (alternative) best.set(doc, Math.max(best.get(doc) ?? 0, score));
          else base.set(doc, (base.get(doc) ?? 0) + score);
          if (weight === 1 || alternative) {
            if (postings[i + TITLE_FIELD]! > 0) inTitle.add(doc);
          }
        }
      }
      for (const doc of new Set([...base.keys(), ...best.keys()])) {
        const score = (base.get(doc) ?? 0) + (best.get(doc) ?? 0);
        scores.set(doc, (scores.get(doc) ?? 0) + score);
        matchedGroups.set(doc, (matchedGroups.get(doc) ?? 0) + 1);
        if (inTitle.has(doc)) titleGroups.set(doc, (titleGroups.get(doc) ?? 0) + 1);
      }
    }

    // "AND suave": un documento que contiene todas las palabras de la consulta va por
    // delante de uno que solo contiene algunas, aunque estas aparezcan muchas veces.
    // Con pesos a 0 un documento puede coincidir sin puntuar; no es un resultado.
    const ranked = [...scores]
      .filter(([, score]) => score > 0)
      .map(([doc, score]) => {
        const coverage = matchedGroups.get(doc)! / groups.length;
        const titleCoverage = (titleGroups.get(doc) ?? 0) / groups.length;
        const depth = this.#documents[doc]!.breadcrumbs.length;
        const boost =
          (1 + this.#ranking.titleBonus * titleCoverage) / (1 + this.#ranking.depthPenalty * depth);
        return { doc, score: score * coverage * coverage * boost };
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
      const tf = postings[offset + 1 + field]! / TF_SCALE;
      if (tf === 0) continue;
      const length = this.#fieldLengths[field]![doc]!;
      const average = this.#averageLengths[field]! || 1;
      const b = this.#ranking.b[field]!;
      weighted += (this.#ranking.weights[field]! * tf) / (1 - b + (b * length) / average);
    }
    return (weighted * (this.#ranking.k1 + 1)) / (this.#ranking.k1 + weighted);
  }

  #parseQuery(query: string, prefix: boolean): QueryGroup[] {
    const groups: { primary: Token; derived: Token[] }[] = [];
    for (const token of tokenize(query.slice(0, 500))) {
      const last = groups.at(-1);
      if (token.primary || !last) groups.push({ primary: token, derived: [] });
      else last.derived.push(token);
    }

    const parsed = groups.map(({ primary, derived }, index): QueryGroup => {
      const terms = new Map<number, Omit<WeightedTerm, 'termIndex'>>();
      const add = (
        termIndex: number | undefined,
        weight: number,
        alternative = false,
        idf?: number,
      ) => {
        if (termIndex === undefined) return;
        const existing = terms.get(termIndex);
        if (existing && existing.weight >= weight) return;
        terms.set(
          termIndex,
          idf === undefined ? { weight, alternative } : { weight, alternative, idf },
        );
      };

      const exact = this.#termIndex.get(primary.term);
      add(exact, 1);
      for (const token of derived)
        add(this.#termIndex.get(token.term), this.#ranking.derivedWeight);

      const expansions =
        prefix && index === groups.length - 1 ? this.#prefixExpansions(primary.term) : [];
      // Puntuación constante para las expansiones (como hace Lucene con las consultas
      // por prefijo): si no, la expansión más rara gana aunque sea la menos útil.
      const expansionIdf =
        expansions[0] === undefined ? 0 : this.#idf(this.#documentFrequency(expansions[0]));
      for (const termIndex of expansions)
        add(termIndex, this.#ranking.prefixWeight, true, expansionIdf);

      const group: QueryGroup = { start: primary.start, end: primary.end, terms: [] };
      if (exact === undefined && expansions.length === 0) {
        // Se compara tanto la forma con stemming como la escrita: "proces" se reduce a
        // "proce", que está más cerca de "probe" que de "process".
        const surface = normalize(query.slice(primary.start, primary.end));
        // Solo se usa la mejor corrección, que es también la que se muestra en
        // "¿Quisiste decir…?": así los resultados y la sugerencia son coherentes.
        const correction = this.#bestCorrection([primary.term, surface]);
        if (correction) {
          add(correction.termIndex, this.#ranking.fuzzyWeights[correction.distance]!, true);
          const term = this.#terms[correction.termIndex]!;
          group.correction = Object.hasOwn(this.#displayForms, term)
            ? this.#displayForms[term]!
            : term;
        }
      }

      for (const [termIndex, term] of terms) group.terms.push({ termIndex, ...term });
      return group;
    });

    // Palabras contiguas que juntas forman un término del índice: "base name" → `basename`,
    // "read file sync" → `readfilesync` no, pero "file sync" → `filesync` sí si existe.
    // El término unido se añade a ambos grupos como alternativa, así que un documento
    // que lo contiene cuenta como si tuviera las dos palabras.
    for (let i = 1; i < groups.length; i++) {
      const joined = this.#termIndex.get(groups[i - 1]!.primary.term + groups[i]!.primary.term);
      if (joined === undefined) continue;
      for (const group of [parsed[i - 1]!, parsed[i]!]) {
        if (!group.terms.some((term) => term.termIndex === joined)) {
          group.terms.push({
            termIndex: joined,
            weight: this.#ranking.joinedWeight,
            alternative: true,
          });
        }
      }
    }

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
      .slice(0, this.#ranking.maxPrefixExpansions);
  }

  #bestCorrection(forms: readonly string[]): { termIndex: number; distance: number } | undefined {
    const best = new Map<number, number>();
    this.#termsByLength ??= this.#groupTermsByLength();
    for (const form of new Set(forms)) {
      const maxEdits = maxEditsFor(form);
      for (let length = form.length - maxEdits; length <= form.length + maxEdits; length++) {
        for (const termIndex of this.#termsByLength.get(length) ?? []) {
          const distance = boundedLevenshtein(form, this.#terms[termIndex]!, maxEdits);
          if (distance <= maxEdits && distance < (best.get(termIndex) ?? Infinity)) {
            best.set(termIndex, distance);
          }
        }
      }
    }
    // A igual distancia, gana el término más frecuente: es la corrección más probable.
    return [...best]
      .map(([termIndex, distance]) => ({ termIndex, distance }))
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          this.#documentFrequency(b.termIndex) - this.#documentFrequency(a.termIndex),
      )[0];
  }

  #groupTermsByLength(): Map<number, number[]> {
    const byLength = new Map<number, number[]>();
    this.#terms.forEach((term, index) => {
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
  if (typeof data !== 'object' || data === null)
    throw new TypeError('Índice inválido: no es un objeto');
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
