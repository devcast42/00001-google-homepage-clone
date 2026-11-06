import type { SourceDocument } from '@docseek/engine';

export interface ExtractedPage {
  readonly documents: SourceDocument[];
  /** Enlaces absolutos encontrados en la página, sin filtrar. */
  readonly links: string[];
}

export type Extractor = (html: string, pageUrl: string, source: string) => ExtractedPage;
