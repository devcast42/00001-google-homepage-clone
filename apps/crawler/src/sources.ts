import { extractNodeDocs } from './extractors/nodejs.js';
import type { Extractor } from './extractors/types.js';

export interface SourceConfig {
  /** Identificador corto; se usa como nombre del corpus y como filtro en la API. */
  readonly name: string;
  readonly label: string;
  readonly startUrls: readonly string[];
  /** Decide qué URLs (ya normalizadas) pertenecen a la fuente y deben rastrearse. */
  readonly inScope: (url: URL) => boolean;
  readonly extract: Extractor;
  readonly maxPages: number;
}

/**
 * Fuentes disponibles. Añadir una nueva documentación consiste en añadir una entrada
 * aquí con su extractor (ver docs/adr/0003-rastreador.md).
 */
export const SOURCES: Readonly<Record<string, SourceConfig>> = {
  nodejs: {
    name: 'nodejs',
    label: 'Node.js API',
    // Se usa /api/ y no /docs/latest/api/: el robots.txt de nodejs.org prohíbe /docs/.
    startUrls: ['https://nodejs.org/api/index.html'],
    inScope: (url) =>
      url.host === 'nodejs.org' &&
      /^\/api\/[a-z0-9_]+\.html$/.test(url.pathname) &&
      // all.html repite el contenido de todas las páginas en una sola.
      url.pathname !== '/api/all.html' &&
      url.search === '',
    extract: extractNodeDocs,
    maxPages: 200,
  },
};
