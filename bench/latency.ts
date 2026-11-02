/**
 * Latencia del motor (sin HTTP): carga del índice, memoria y percentiles por consulta.
 * Se usan todas las consultas de evaluación, en modo búsqueda y en modo autocompletar
 * (prefijos de 2 a N caracteres, como al teclear). Uso: `npm run bench:latency`.
 */
import { loadIndex } from './load-index.js';
import { loadJudgements } from './evaluate.js';

const ROUNDS = 20;
const heapBefore = process.memoryUsage().heapUsed;
const { index, loadMs } = loadIndex();
global.gc?.();
const heapMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;

const queries = [...loadJudgements('queries'), ...loadJudgements('holdout')].map(({ query }) => query);
const prefixes = queries.flatMap((query) =>
  Array.from({ length: query.length - 1 }, (_, i) => query.slice(0, i + 2)),
);

function measure(label: string, inputs: string[], run: (input: string) => unknown): void {
  for (const input of inputs) run(input); // calentamiento (JIT)
  const samples: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    for (const input of inputs) {
      const started = performance.now();
      run(input);
      samples.push(performance.now() - started);
    }
  }
  samples.sort((a, b) => a - b);
  const at = (p: number) => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))]!;
  console.info(
    `${label.padEnd(14)} n=${String(samples.length).padStart(6)}  p50 ${at(0.5).toFixed(2)} ms  ` +
      `p95 ${at(0.95).toFixed(2)} ms  p99 ${at(0.99).toFixed(2)} ms  max ${at(1).toFixed(2)} ms`,
  );
}

const stats = index.stats();
console.info(
  `Índice: ${stats.documents} documentos, ${stats.terms} términos · carga ${loadMs.toFixed(0)} ms · ~${heapMb.toFixed(0)} MB de heap\n`,
);
measure('search', queries, (query) => index.search(query, { limit: 10 }));
measure('suggest', prefixes, (prefix) => index.suggest(prefix, 8));
