import { createHash } from 'node:crypto';
import type { SourceDocument } from '@docseek/engine';
import { FetchError, type PoliteFetcher } from './fetcher.js';
import { ALLOW_ALL, parseRobots, type RobotsRules } from './robots.js';
import type { SourceConfig } from './sources.js';
import { normalizeUrl } from './url.js';

export interface CrawlOptions {
  readonly fetcher: PoliteFetcher;
  readonly userAgent: string;
  readonly concurrency?: number;
  readonly maxPages?: number;
  readonly log?: (message: string) => void;
}

export interface CrawlStats {
  pagesFetched: number;
  pagesSkippedByRobots: number;
  pagesDuplicated: number;
  pagesFailed: number;
  documents: number;
}

export interface CrawlResult {
  readonly documents: SourceDocument[];
  readonly stats: CrawlStats;
  readonly failures: { url: string; reason: string }[];
}

/**
 * Recorre una fuente en anchura a partir de sus URLs iniciales.
 *
 * Garantías: cada URL se visita una vez, nunca se pide una ruta que robots.txt prohíbe,
 * las páginas con contenido idéntico se descartan y la salida está ordenada por id,
 * así que dos rastreos del mismo contenido producen exactamente el mismo corpus.
 */
export async function crawl(source: SourceConfig, options: CrawlOptions): Promise<CrawlResult> {
  const {
    fetcher,
    userAgent,
    concurrency = 2,
    maxPages = source.maxPages,
    log = () => {},
  } = options;
  const stats: CrawlStats = {
    pagesFetched: 0,
    pagesSkippedByRobots: 0,
    pagesDuplicated: 0,
    pagesFailed: 0,
    documents: 0,
  };
  const failures: { url: string; reason: string }[] = [];
  const robotsByHost = new Map<string, Promise<RobotsRules>>();
  const seen = new Set<string>();
  const contentHashes = new Set<string>();
  const documents = new Map<string, SourceDocument>();
  const queue: string[] = [];

  const enqueue = (raw: string, base?: string) => {
    const url = normalizeUrl(raw, base);
    if (!url || seen.has(url) || !source.inScope(new URL(url))) return;
    seen.add(url);
    queue.push(url);
  };

  const robotsFor = (url: URL) => {
    let rules = robotsByHost.get(url.host);
    if (!rules) {
      rules = loadRobots(url, fetcher, userAgent, log);
      robotsByHost.set(url.host, rules);
    }
    return rules;
  };

  for (const url of source.startUrls) enqueue(url);

  const worker = async () => {
    while (queue.length > 0 && stats.pagesFetched + stats.pagesFailed < maxPages) {
      const url = queue.shift()!;
      const parsed = new URL(url);
      if (!(await robotsFor(parsed)).isAllowed(parsed.pathname + parsed.search)) {
        stats.pagesSkippedByRobots++;
        log(`robots.txt prohíbe ${url}`);
        continue;
      }

      let html: string;
      try {
        const page = await fetcher.get(url);
        if (!page.contentType.includes('html')) continue;
        html = page.body;
      } catch (error) {
        stats.pagesFailed++;
        const reason = error instanceof FetchError ? error.message : String(error);
        failures.push({ url, reason });
        log(`✗ ${url}: ${reason}`);
        continue;
      }
      stats.pagesFetched++;

      const page = source.extract(html, url, source.name);
      for (const link of page.links) enqueue(link);

      const hash = createHash('sha256')
        .update(page.documents.map((document) => document.body).join('\n'))
        .digest('hex');
      if (contentHashes.has(hash)) {
        stats.pagesDuplicated++;
        continue;
      }
      contentHashes.add(hash);

      for (const document of page.documents) documents.set(document.id, document);
      log(`✓ ${url} (${page.documents.length} secciones, ${queue.length} en cola)`);
    }
  };

  // Los trabajadores terminan cuando la cola se vacía; uno puede vaciarla mientras otro
  // aún está descargando una página que añadirá enlaces nuevos, así que se repite.
  while (queue.length > 0 && stats.pagesFetched + stats.pagesFailed < maxPages) {
    await Promise.all(Array.from({ length: concurrency }, worker));
  }

  const sorted = [...documents.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  stats.documents = sorted.length;
  return { documents: sorted, stats, failures };
}

/**
 * RFC 9309 §2.3.1: si robots.txt no existe (4xx) se puede rastrear todo; si no se puede
 * obtener por un error del servidor o de red, hay que asumir que todo está prohibido.
 */
async function loadRobots(
  url: URL,
  fetcher: PoliteFetcher,
  userAgent: string,
  log: (message: string) => void,
): Promise<RobotsRules> {
  const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
  try {
    const page = await fetcher.get(robotsUrl);
    const rules = parseRobots(page.body, userAgent);
    if (rules.crawlDelaySeconds !== undefined) {
      fetcher.setHostInterval(url.host, rules.crawlDelaySeconds * 1000);
    }
    return rules;
  } catch (error) {
    if (error instanceof FetchError && error.status !== undefined && error.status < 500) {
      return ALLOW_ALL;
    }
    log(`No se pudo leer ${robotsUrl}; se asume que no se permite rastrear ${url.host}`);
    return { isAllowed: () => false };
  }
}
