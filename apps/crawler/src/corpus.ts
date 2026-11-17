import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { createGunzip, gzip } from 'node:zlib';
import type { SourceDocument } from '@docseek/engine';

const gzipAsync = promisify(gzip);
const CORPUS_SUFFIX = '.jsonl.gz';

/**
 * El corpus es la salida del rastreador y la entrada del indexador: un fichero JSONL
 * comprimido por fuente. Se versiona en el repositorio para que el índice se pueda
 * reconstruir (en CI, en Docker) sin volver a rastrear la web.
 */
export async function writeCorpus(
  directory: string,
  source: string,
  documents: readonly SourceDocument[],
  metadata: Record<string, unknown>,
): Promise<string> {
  await mkdir(directory, { recursive: true });
  const file = join(directory, `${source}${CORPUS_SUFFIX}`);
  const jsonl = documents.map((document) => JSON.stringify(document)).join('\n') + '\n';
  // zlib escribe mtime 0 en la cabecera gzip: mismo contenido → mismo fichero → diffs limpios.
  await writeFile(file, await gzipAsync(jsonl, { level: 9 }));
  await writeFile(
    join(directory, `${source}.meta.json`),
    `${JSON.stringify({ source, documents: documents.length, ...metadata }, null, 2)}\n`,
  );
  return file;
}

export async function* readCorpus(directory: string): AsyncGenerator<SourceDocument> {
  const files = (await readdir(directory)).filter((name) => name.endsWith(CORPUS_SUFFIX)).sort();
  for (const name of files) {
    const lines = createInterface({
      input: createReadStream(join(directory, name)).pipe(createGunzip()),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (line.trim() !== '') yield JSON.parse(line) as SourceDocument;
    }
  }
}
