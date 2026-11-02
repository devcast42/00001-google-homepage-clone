import { tokenize } from './tokenizer.js';
import { FIELDS, type SourceDocument } from './types.js';
import { SearchIndex, type SerializedIndex, INDEX_FORMAT_VERSION } from './search-index.js';

const FIELD_COUNT = FIELDS.length;

/**
 * Construye un índice invertido a partir de documentos.
 *
 * Para cada término guarda una lista de publicaciones ordenada por documento con la
 * frecuencia del término en cada campo. El ranking (BM25F) se calcula en tiempo de
 * consulta, así que cambiar pesos no obliga a reindexar.
 */
export class IndexBuilder {
  readonly #documents: SourceDocument[] = [];
  readonly #ids = new Set<string>();
  readonly #fieldLengths: number[][] = FIELDS.map(() => []);
  /** término → [doc, tfTitle, tfBreadcrumbs, tfBody, doc, ...] */
  readonly #postings = new Map<string, number[]>();

  /** Añade un documento. Lanza un error si el id está repetido. */
  add(document: SourceDocument): this {
    if (this.#ids.has(document.id)) throw new Error(`Documento duplicado: ${document.id}`);
    this.#ids.add(document.id);

    const docIndex = this.#documents.length;
    this.#documents.push(document);

    const fieldTexts: Record<(typeof FIELDS)[number], string> = {
      title: document.title,
      breadcrumbs: document.breadcrumbs.join(' '),
      body: document.body,
    };

    const frequencies = new Map<string, number[]>();
    FIELDS.forEach((field, fieldIndex) => {
      const tokens = tokenize(fieldTexts[field]);
      this.#fieldLengths[fieldIndex]!.push(tokens.filter((token) => token.primary).length);
      for (const { term } of tokens) {
        let tf = frequencies.get(term);
        if (!tf) {
          tf = new Array<number>(FIELD_COUNT).fill(0);
          frequencies.set(term, tf);
        }
        tf[fieldIndex]!++;
      }
    });

    for (const [term, tf] of frequencies) {
      let list = this.#postings.get(term);
      if (!list) {
        list = [];
        this.#postings.set(term, list);
      }
      list.push(docIndex, ...tf);
    }

    return this;
  }

  addAll(documents: Iterable<SourceDocument>): this {
    for (const document of documents) this.add(document);
    return this;
  }

  get size(): number {
    return this.#documents.length;
  }

  /**
   * Forma serializable del índice. Los ids de documento de cada lista de
   * publicaciones se guardan como diferencias respecto al anterior (delta encoding),
   * lo que reduce el JSON resultante en torno a un tercio.
   */
  serialize(builtAt = new Date()): SerializedIndex {
    const terms = [...this.#postings.keys()].sort();
    const postings = terms.map((term) => {
      const list = this.#postings.get(term)!;
      const encoded = list.slice();
      for (let i = encoded.length - (FIELD_COUNT + 1); i > 0; i -= FIELD_COUNT + 1) {
        encoded[i]! -= encoded[i - (FIELD_COUNT + 1)]!;
      }
      return encoded;
    });

    return {
      version: INDEX_FORMAT_VERSION,
      builtAt: builtAt.toISOString(),
      fields: [...FIELDS],
      documents: this.#documents.map(({ id, url, source, title, breadcrumbs, body }) => ({
        id,
        url,
        source,
        title,
        breadcrumbs: [...breadcrumbs],
        body,
      })),
      fieldLengths: this.#fieldLengths.map((lengths) => lengths.slice()),
      terms,
      postings,
    };
  }

  build(): SearchIndex {
    return SearchIndex.fromJSON(this.serialize());
  }
}
