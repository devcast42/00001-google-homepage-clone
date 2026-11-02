/**
 * Evaluación de calidad del ranking sobre el corpus real.
 *
 * Cada consulta de `queries.json` lleva los títulos (o prefijos de título) de las
 * secciones que un desarrollador esperaría ver. Se calculan las métricas estándar:
 *
 * - Success@1 / Success@3: % de consultas con un resultado relevante en el top 1 / top 3.
 * - MRR@10 (Mean Reciprocal Rank): media de 1/posición del primer resultado relevante.
 *
 * Uso: `npm run bench:relevance` (añade `-- --verbose` para ver cada consulta y
 * `-- --set holdout` para usar el conjunto de validación).
 * Con `--min-mrr 0.8` falla si la calidad baja de ese umbral (se usa en CI).
 */
import { parseArgs } from 'node:util';
import { evaluate, loadJudgements } from './evaluate.js';
import { loadIndex } from './load-index.js';

const { values } = parseArgs({
  options: {
    verbose: { type: 'boolean', default: false },
    set: { type: 'string', default: 'queries' },
    'min-mrr': { type: 'string' },
  },
});

if (values.set !== 'queries' && values.set !== 'holdout') {
  console.error('--set debe ser "queries" o "holdout"');
  process.exit(1);
}
const judgements = loadJudgements(values.set);
const { index, data } = loadIndex();

// Comprueba que cada juicio apunta a secciones que existen, para no medir contra erratas.
const missing = judgements.flatMap(({ relevant }) =>
  relevant.filter((prefix) => !data.documents.some((doc) => doc.title.startsWith(prefix))),
);
if (missing.length > 0) {
  console.error(`Títulos relevantes que no existen en el índice:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const metrics = evaluate(index, judgements);
if (values.verbose) {
  for (const { query, rank, top } of metrics.outcomes) {
    const mark = rank === 1 ? '✓' : rank > 0 ? '~' : '✗';
    console.info(`${mark} ${String(rank || '-').padStart(2)}  ${query.padEnd(30)} → ${top ?? '(sin resultados)'}`);
  }
  console.info();
}
console.info(
  `[${values.set}] ${metrics.queries} consultas · Success@1 ${pct(metrics.successAt1)} · ` +
    `Success@3 ${pct(metrics.successAt3)} · MRR@10 ${metrics.mrr.toFixed(3)}`,
);

const minimum = values['min-mrr'];
if (minimum !== undefined && metrics.mrr < Number(minimum)) {
  console.error(`MRR ${metrics.mrr.toFixed(3)} por debajo del mínimo ${minimum}`);
  process.exit(1);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
