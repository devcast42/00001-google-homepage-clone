import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalog } from './catalog.mjs';
import { analyze } from './analyze.mjs';

const catalog = buildCatalog(process.argv[2]);
const body = readFileSync(join(import.meta.dirname, '../holdout/api-client.mjs'), 'utf8').split('\n');
const imports = body.filter((l) => l.startsWith('import'));
const rest = body.filter((l) => !l.startsWith('import')).join('\n').replaceAll('await ', '');
// Archivos sintéticos de N líneas: el mismo código repetido dentro de funciones distintas.
const make = (lines) => {
  const blocks = Math.max(1, Math.round(lines / rest.split('\n').length));
  return imports.join('\n') + '\n' + Array.from({ length: blocks }, (_, i) => `async function block${i}() {\n${rest}\n}`).join('\n');
};
const t0 = performance.now(); analyze('warmup.mjs', make(30), catalog); const cold = performance.now() - t0;
console.log(`arranque en frío (carga de @types/node): ${cold.toFixed(0)} ms`);
for (const n of [50, 500, 2000, 5000]) {
  const code = make(n);
  const times = [];
  let findings = 0;
  for (let i = 0; i < 5; i++) { const t = performance.now(); findings = analyze(`f${n}.mjs`, code, catalog).findings.length; times.push(performance.now() - t); }
  times.sort((a, b) => a - b);
  console.log(`${String(code.split('\n').length).padStart(5)} líneas · ${String(findings).padStart(5)} hallazgos · mediana ${times[2].toFixed(0)} ms · máx ${times[4].toFixed(0)} ms`);
}
console.log(`memoria RSS: ${Math.round(process.memoryUsage().rss / 1048576)} MB`);
