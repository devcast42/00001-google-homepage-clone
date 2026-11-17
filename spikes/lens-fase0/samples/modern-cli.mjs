import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

process.loadEnvFile();
const { values } = parseArgs({ options: { out: { type: 'string' } } });
const outDir = path.resolve(values.out ?? 'dist');

for await (const file of glob('src/**/*.md')) {
  const text = await readFile(file, 'utf8');
  await writeFile(path.join(outDir, path.basename(file)), text.toUpperCase());
}

await pipeline(createReadStream('big.log'), createGzip(), createWriteStream('big.log.gz'));
console.log(styleText('green', 'done'), import.meta.dirname);
const timer = setTimeout(() => {}, 10);
clearTimeout(timer);
