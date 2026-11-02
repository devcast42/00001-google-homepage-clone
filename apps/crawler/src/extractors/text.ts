import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';

const BLOCK_ELEMENTS = 'p, li, pre, div, tr, td, th, h1, h2, h3, h4, h5, h6, blockquote, dt, dd, br';

/**
 * Texto plano de un fragmento HTML, con espacios entre bloques.
 * `.text()` de cheerio concatena `<p>a</p><p>b</p>` como "ab"; aquí se obtiene "a b".
 */
export function blockText($: CheerioAPI, nodes: Cheerio<AnyNode>): string {
  // Los nodos clonados no tienen padre, así que se envuelven para poder insertar
  // separadores también después de los bloques de primer nivel.
  const container = $('<div></div>').append(nodes.clone());
  container.find(BLOCK_ELEMENTS).after(' ');
  return collapseWhitespace(container.text());
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
