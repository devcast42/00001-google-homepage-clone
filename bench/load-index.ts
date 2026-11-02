import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SearchIndex, type SerializedIndex } from '@docseek/engine';

export const INDEX_PATH = resolve(import.meta.dirname, '../data/index.json');

export function loadIndex(): { index: SearchIndex; data: SerializedIndex; loadMs: number } {
  const started = performance.now();
  const data = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as SerializedIndex;
  const index = SearchIndex.fromJSON(data);
  return { index, data, loadMs: performance.now() - started };
}
