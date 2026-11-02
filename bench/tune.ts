/**
 * Ajuste de los parámetros del ranking por descenso por coordenadas: se recorre cada
 * parámetro, se prueba cada valor candidato manteniendo el resto fijo y se conserva el
 * que mejor MRR da. Se repite hasta que ninguna pasada mejora.
 *
 * Ojo con el sobreajuste: con ~50 consultas los parámetros pueden adaptarse a ellas.
 * Por eso solo se aceptan mejoras de más de 0.005 y los valores candidatos son pocos y
 * razonables. Uso: `npm run bench:tune`.
 */
import { DEFAULT_RANKING, type RankingConfig } from '@docseek/engine';
import { evaluate, loadJudgements } from './evaluate.js';
import { loadIndex } from './load-index.js';

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const { index } = loadIndex();
const judgements = loadJudgements();
const score = (ranking: RankingConfig) => {
  const metrics = evaluate(index.withRanking(ranking), judgements);
  return metrics.mrr + metrics.successAt1 * 0.001;
};

const axes: { name: string; values: number[]; apply: (r: Mutable<RankingConfig>, v: number) => void }[] = [
  { name: 'k1', values: [0.6, 0.9, 1.2, 1.6, 2.0], apply: (r, v) => (r.k1 = v) },
  { name: 'weights.title', values: [2, 3, 5, 8, 12], apply: (r, v) => (r.weights = [v, r.weights[1], r.weights[2]]) },
  { name: 'weights.breadcrumbs', values: [0, 0.5, 1, 1.5, 3], apply: (r, v) => (r.weights = [r.weights[0], v, r.weights[2]]) },
  { name: 'b.title', values: [0, 0.2, 0.4, 0.6, 0.8], apply: (r, v) => (r.b = [v, r.b[1], r.b[2]]) },
  { name: 'b.body', values: [0.3, 0.5, 0.75, 0.9, 1], apply: (r, v) => (r.b = [r.b[0], r.b[1], v]) },
  { name: 'derivedWeight', values: [0.15, 0.25, 0.35, 0.5, 0.75], apply: (r, v) => (r.derivedWeight = v) },
  { name: 'titleBonus', values: [0, 0.25, 0.5, 1, 2, 3], apply: (r, v) => (r.titleBonus = v) },
  { name: 'depthPenalty', values: [0, 0.05, 0.1, 0.2, 0.35], apply: (r, v) => (r.depthPenalty = v) },
  { name: 'joinedWeight', values: [0, 0.2, 0.4, 0.6, 0.8], apply: (r, v) => (r.joinedWeight = v) },
];

let best: Mutable<RankingConfig> = structuredClone(DEFAULT_RANKING) as Mutable<RankingConfig>;
let bestScore = score(best);
console.info(`inicial: MRR ${bestScore.toFixed(3)}`);

for (let pass = 1; pass <= 5; pass++) {
  let improved = false;
  for (const axis of axes) {
    for (const value of axis.values) {
      const candidate = structuredClone(best) as Mutable<RankingConfig>;
      axis.apply(candidate, value);
      const candidateScore = score(candidate);
      if (candidateScore > bestScore + 0.005) {
        best = candidate;
        bestScore = candidateScore;
        improved = true;
        console.info(`pasada ${pass}: ${axis.name} = ${value} → MRR ${candidateScore.toFixed(3)}`);
      }
    }
  }
  if (!improved) break;
}

const final = evaluate(index.withRanking(best), judgements);
console.info(
  `\nfinal: Success@1 ${(final.successAt1 * 100).toFixed(1)}% · Success@3 ${(final.successAt3 * 100).toFixed(1)}% · MRR ${final.mrr.toFixed(3)}`,
);
console.info(JSON.stringify(best, null, 2));
