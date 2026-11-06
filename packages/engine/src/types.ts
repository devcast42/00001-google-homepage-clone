/** Campos indexados de cada documento, en el orden en que se guardan las frecuencias. */
export const FIELDS = ['title', 'breadcrumbs', 'body'] as const;
export type Field = (typeof FIELDS)[number];

/** Una sección de documentación, tal y como la produce el rastreador. */
export interface SourceDocument {
  /** Identificador estable. Por convención, la URL canónica con el ancla de la sección. */
  readonly id: string;
  readonly url: string;
  /** Fuente de la que procede, por ejemplo `nodejs`. Permite filtrar. */
  readonly source: string;
  /** Encabezado de la sección, por ejemplo `fs.readFile(path[, options], callback)`. */
  readonly title: string;
  /** Encabezados padre, de más general a más concreto. */
  readonly breadcrumbs: readonly string[];
  /** Texto plano de la sección, sin HTML. */
  readonly body: string;
}

/** Texto con rangos `[inicio, fin)` que deben resaltarse. */
export interface Highlighted {
  readonly text: string;
  readonly highlights: readonly (readonly [number, number])[];
}

export interface SearchHit {
  readonly id: string;
  readonly url: string;
  readonly source: string;
  readonly breadcrumbs: readonly string[];
  readonly title: Highlighted;
  readonly snippet: Highlighted;
  readonly score: number;
}

export interface SearchOptions {
  /** Número máximo de resultados. Por defecto, 10. */
  readonly limit?: number;
  /** Resultados a saltar, para paginar. Por defecto, 0. */
  readonly offset?: number;
  /**
   * Trata la última palabra como prefijo ("búsqueda mientras escribes"):
   * `fs.read` también encuentra `fs.readFile` y `fs.readdir`.
   */
  readonly prefix?: boolean;
  /** Limita los resultados a estas fuentes. */
  readonly sources?: readonly string[];
}

export interface SearchResult {
  /** Total de documentos que coinciden, sin paginar. */
  readonly total: number;
  readonly hits: readonly SearchHit[];
  /** Consulta corregida si alguna palabra no existía en el índice y se usó una parecida. */
  readonly didYouMean?: string;
}

export interface Suggestion {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly breadcrumbs: readonly string[];
}

export interface IndexStats {
  readonly documents: number;
  readonly terms: number;
  readonly sources: Readonly<Record<string, number>>;
  readonly builtAt: string;
}
