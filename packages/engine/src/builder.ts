import { tokenize } from './tokenizer.js';
import { FIELDS, type SourceDocument } from './types.js';
import { SearchIndex, type SerializedIndex, INDEX_FORMAT_VERSION } from './search-index.js';

const FIELD_COUNT = FIELDS.length;

/** Las frecuencias se guardan en medias unidades para poder ponderar sin usar decimales. */
export const TF_PRIMARY = 2;
export const TF_DERIVED = 1;

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
  /** término → (forma escrita → apariciones), para mostrar correcciones como `readFile`. */
  readonly #surfaceForms = new Map<string, Map<string, number>>();

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
      for (const { term, primary, start, end } of tokens) {
        // Las partes interiores de camelCase ("Listener" en `addListener`) tienen la
        // mayúscula por estar dentro de otra palabra, no por cómo se escribe el término.
        const text = fieldTexts[field];
        if (primary || !/[\p{L}\p{N}]/u.test(text[start - 1] ?? '')) {
          this.#countSurfaceForm(term, text.slice(start, end));
        }
        let tf = frequencies.get(term);
        if (!tf) {
          tf = new Array<number>(FIELD_COUNT).fill(0);
          frequencies.set(term, tf);
        }
        // Una palabra completa cuenta el doble que una parte de un identificador: "http"
        // en `http.createServer` pesa más que el "http" de `Http1ServerResponse`.
        tf[fieldIndex]! += primary ? TF_PRIMARY : TF_DERIVED;
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

  #countSurfaceForm(term: string, surface: string): void {
    // Las formas que no coinciden con el término salvo mayúsculas (plurales reducidos
    // por el stemmer, por ejemplo) no sirven para mostrarlo.
    if (surface.toLowerCase() !== term) return;
    let forms = this.#surfaceForms.get(term);
    if (!forms) {
      forms = new Map();
      this.#surfaceForms.set(term, forms);
    }
    forms.set(surface, (forms.get(surface) ?? 0) + 1);
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

    // Forma más habitual de cada término; solo se guarda si no es la minúscula,
    // así que "readfile" → "readFile" sí, y "the" (frente a "The") no.
    const displayForms: Record<string, string> = {};
    for (const [term, forms] of this.#surfaceForms) {
      const [surface] = [...forms].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]!;
      if (surface !== term) displayForms[term] = surface;
    }

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
      displayForms,
    };
  }

  build(): SearchIndex {
    return SearchIndex.fromJSON(this.serialize());
  }
}
