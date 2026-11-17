import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { crawl } from '../crawler.js';
import { writeCorpus } from '../corpus.js';
import { PoliteFetcher } from '../fetcher.js';
import { SOURCES } from '../sources.js';

const USER_AGENT = 'DocSeekBot/0.1 (+https://github.com/devcast42/00001-google-homepage-clone)';

const { values } = parseArgs({
  options: {
    source: { type: 'string', default: 'nodejs' },
    'max-pages': { type: 'string' },
    concurrency: { type: 'string', default: '2' },
    'interval-ms': { type: 'string', default: '500' },
    out: { type: 'string', default: resolve(import.meta.dirname, '../../../../data/corpus') },
  },
});

const source = SOURCES[values.source];
if (!source) {
  console.error(
    `Fuente desconocida "${values.source}". Disponibles: ${Object.keys(SOURCES).join(', ')}`,
  );
  process.exit(1);
}

const started = Date.now();
const result = await crawl(source, {
  fetcher: new PoliteFetcher({
    userAgent: USER_AGENT,
    minIntervalMs: Number(values['interval-ms']),
  }),
  userAgent: USER_AGENT,
  concurrency: Number(values.concurrency),
  ...(values['max-pages'] ? { maxPages: Number(values['max-pages']) } : {}),
  log: (message) => console.info(message),
});

if (result.documents.length === 0) {
  console.error('No se extrajo ningún documento; no se sobrescribe el corpus.');
  process.exit(1);
}

const file = await writeCorpus(values.out, source.name, result.documents, {
  label: source.label,
  startUrls: source.startUrls,
  crawledAt: new Date().toISOString(),
  userAgent: USER_AGENT,
  stats: result.stats,
});

console.info(
  `\n${source.label}: ${result.stats.documents} secciones de ${result.stats.pagesFetched} páginas ` +
    `en ${((Date.now() - started) / 1000).toFixed(1)} s → ${file}`,
);
if (result.failures.length > 0) {
  console.warn(`${result.failures.length} páginas fallaron:`);
  for (const failure of result.failures) console.warn(`  ${failure.url}: ${failure.reason}`);
}
