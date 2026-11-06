import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalog } from './catalog.mjs';
import { analyze } from './analyze.mjs';

const [corpus, set = 'samples'] = process.argv.slice(2);
const samples = join(import.meta.dirname, '..', set);
const t0 = performance.now();
const catalog = buildCatalog(corpus);
console.log(`catálogo: ${catalog.byKey.size} claves en ${Math.round(performance.now() - t0)} ms`);
const expected = JSON.parse(readFileSync(join(samples, 'expected.json'), 'utf8'));

let tp = 0, totalExpected = 0, fp = 0, totalFound = 0;
const files = readdirSync(samples).filter((f) => f !== 'expected.json');
for (const [round, label] of [[0, 'frío'], [1, 'caliente']]) {
  for (const file of files) {
    const code = readFileSync(join(samples, file), 'utf8');
    const t = performance.now();
    const { findings, unresolved } = analyze(file, code, catalog);
    const ms = performance.now() - t;
    if (round === 0) { console.log(`\n${file}: ${ms.toFixed(0)} ms (${label})`); continue; }
    console.log(`\n=== ${file}: ${ms.toFixed(0)} ms (${label}) · ${code.split('\n').length} líneas`);
    const exp = expected[file];
    const used = new Set();
    for (const [l, prefix] of exp) {
      totalExpected++;
      const i = findings.findIndex((f, idx) => !used.has(idx) && f.line === l && prefix.split('|').some((p) => f.title.startsWith(p)));
      if (i >= 0) { used.add(i); tp++; const f = findings[i]; if (f.status !== 'stable') console.log(`  ⚠ ${f.status.padEnd(10)} L${l} ${f.label} → ${f.dep?.title ?? f.title}${f.replacement ? ' · ' + f.replacement : ''}`); } else console.log(`  ✗ falta  L${l} ${prefix}`);
    }
    findings.forEach((f, idx) => { totalFound++; if (!used.has(idx)) { fp++; console.log(`  ? extra  L${f.line} ${f.label} → ${f.title}${f.status !== 'stable' ? ' [' + f.status + ']' : ''}`); } });
    for (const u of unresolved) console.log(`  · sin sección L${u.line} ${u.label}  [${u.tried.join(', ')}]`);
  }
}
console.log(`\nCobertura (recall): ${tp}/${totalExpected} = ${(100 * tp / totalExpected).toFixed(0)}%`);
console.log(`Hallazgos no anotados: ${fp}/${totalFound}`);
console.log(`Memoria RSS: ${Math.round(process.memoryUsage().rss / 1048576)} MB`);
