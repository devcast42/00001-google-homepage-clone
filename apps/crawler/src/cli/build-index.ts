import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { IndexBuilder } from '@docseek/engine';
import { readCorpus } from '../corpus.js';

const dataDir = resolve(import.meta.dirname, '../../../../data');
const { values } = parseArgs({
  options: {
    corpus: { type: 'string', default: resolve(dataDir, 'corpus') },
    out: { type: 'string', default: resolve(dataDir, 'index.json') },
  },
});

const started = performance.now();
const builder = new IndexBuilder();
for await (const document of readCorpus(values.corpus)) builder.add(document);

if (builder.size === 0) {
  console.error(`No hay documentos en ${values.corpus}. Ejecuta antes \`npm run crawl\`.`);
  process.exit(1);
}

const serialized = builder.serialize();
const json = JSON.stringify(serialized);
await writeFile(values.out, json);

console.info(
  `Índice: ${serialized.documents.length} documentos, ${serialized.terms.length} términos, ` +
    `${(json.length / 1024 / 1024).toFixed(1)} MB, ${Math.round(performance.now() - started)} ms → ${values.out}`,
);
