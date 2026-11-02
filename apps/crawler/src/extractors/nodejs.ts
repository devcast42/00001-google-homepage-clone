import { load } from 'cheerio';
import type { SourceDocument } from '@docseek/engine';
import { normalizeUrl } from '../url.js';
import { blockText, collapseWhitespace } from './text.js';
import type { Extractor } from './types.js';

/**
 * Extractor para la referencia de la API de Node.js (https://nodejs.org/api/).
 *
 * Cada página es una lista plana de `<section>`, cada una encabezada por un `h2`–`h6`.
 * Cada sección se convierte en un documento independiente con su ancla, de modo que
 * un resultado lleva directamente a `fs.readFile()` y no al principio de la página de `fs`.
 * La jerarquía se reconstruye a partir del nivel de los encabezados.
 */
export const extractNodeDocs: Extractor = (html, pageUrl, source) => {
  const $ = load(html);
  const links = $('a[href]')
    .map((_, element) => normalizeUrl($(element).attr('href')!, pageUrl))
    .get()
    .filter((link): link is string => link !== undefined);

  const content = $('#apicontent');
  // Ruido que no aporta a la búsqueda: metadatos de versión, historial de cambios,
  // el selector ESM/CommonJS, la variante CommonJS duplicada de cada ejemplo y la barra
  // de cada bloque de código (etiqueta del lenguaje y botón "copy").
  content
    .find(
      '.api_metadata, details.changelog, input, button, .code-toolbar, pre > code:not(:first-of-type)',
    )
    .remove();

  const documents: SourceDocument[] = [];
  const stack: { level: number; title: string }[] = [];
  const usedAnchors = new Set<string>();
  const pageBase = pageUrl.split('#')[0]!;

  content.children('section').each((_, element) => {
    const section = $(element);
    const heading = section.children('h1, h2, h3, h4, h5, h6').first();
    if (heading.length === 0) return;

    const level = Number(heading.prop('tagName')!.slice(1));
    let anchor = heading.find('a.mark').attr('id') ?? slugify(heading.text());
    heading.find('span').remove();
    const title = collapseWhitespace(heading.text());
    if (title === '') return;

    while (stack.length > 0 && stack.at(-1)!.level >= level) stack.pop();
    const breadcrumbs = stack.map((entry) => entry.title);
    stack.push({ level, title });

    const body = blockText($, section.children().not(heading));
    if (body === '' && level > 2) return;

    for (let suffix = 2; usedAnchors.has(anchor); suffix++) anchor = `${anchor}_${suffix}`;
    usedAnchors.add(anchor);

    const url = `${pageBase}#${anchor}`;
    documents.push({ id: url, url, source, title, breadcrumbs, body });
  });

  return { documents, links };
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
