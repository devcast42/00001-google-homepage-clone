import type { SearchHit, Suggestion } from '@docseek/engine';

/** Contrato de `GET /api/search` (ver apps/api/src/app.ts). */
export interface SearchResponse {
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly tookMs: number;
  readonly didYouMean?: string;
  readonly results: readonly SearchHit[];
}

export interface SuggestResponse {
  readonly query: string;
  readonly suggestions: readonly Suggestion[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getJson<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );
  const response = await fetch(`${path}?${query}`, {
    signal: signal ?? null,
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { error?: { message?: string } } | undefined;
    const message =
      response.status === 429
        ? 'Demasiadas búsquedas seguidas. Espera unos segundos.'
        : (body?.error?.message ?? `Error ${response.status}`);
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export const PAGE_SIZE = 10;

export function search(q: string, page: number, signal?: AbortSignal): Promise<SearchResponse> {
  return getJson('/api/search', { q, page, pageSize: PAGE_SIZE }, signal);
}

export function suggest(q: string, signal?: AbortSignal): Promise<SuggestResponse> {
  return getJson('/api/suggest', { q, limit: 8 }, signal);
}
