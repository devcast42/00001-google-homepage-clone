import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SearchIndex } from '@docseek/engine';

export interface Judgement {
  readonly query: string;
  /** Títulos (o prefijos de título) de las secciones que se consideran una buena respuesta. */
  readonly relevant: readonly string[];
}

export interface QueryOutcome {
  readonly query: string;
  /** Posición (1-10) del primer resultado relevante, o 0 si no aparece. */
  readonly rank: number;
  readonly top: string | undefined;
}

export interface Metrics {
  readonly queries: number;
  readonly successAt1: number;
  readonly successAt3: number;
  readonly mrr: number;
  readonly outcomes: readonly QueryOutcome[];
}

/**
 * `queries` es el conjunto de ajuste (lo usa `bench:tune`); `holdout` es un conjunto de
 * validación que el ajuste no ve, para comprobar que las mejoras generalizan.
 */
export function loadJudgements(set: 'queries' | 'holdout' = 'queries'): Judgement[] {
  return JSON.parse(readFileSync(resolve(import.meta.dirname, `${set}.json`), 'utf8')) as Judgement[];
}

export function evaluate(index: SearchIndex, judgements: readonly Judgement[]): Metrics {
  const outcomes = judgements.map(({ query, relevant }): QueryOutcome => {
    const hits = index.search(query, { limit: 10 }).hits;
    const rank = hits.findIndex((hit) => relevant.some((prefix) => hit.title.text.startsWith(prefix))) + 1;
    return { query, rank, top: hits[0]?.title.text };
  });
  const n = outcomes.length;
  return {
    queries: n,
    successAt1: outcomes.filter(({ rank }) => rank === 1).length / n,
    successAt3: outcomes.filter(({ rank }) => rank > 0 && rank <= 3).length / n,
    mrr: outcomes.reduce((sum, { rank }) => sum + (rank > 0 ? 1 / rank : 0), 0) / n,
    outcomes,
  };
}
