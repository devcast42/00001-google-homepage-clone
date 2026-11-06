import { useEffect, useState } from 'react';
import { search, type SearchResponse } from '../api';

export type SearchState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly previous?: SearchResponse }
  | { readonly status: 'success'; readonly data: SearchResponse }
  | { readonly status: 'error'; readonly message: string };

type Outcome = { readonly key: string } & (
  { readonly data: SearchResponse } | { readonly message: string }
);

/**
 * Lanza la búsqueda cada vez que cambian la consulta o la página y cancela la petición
 * anterior si aún no ha terminado, para que una respuesta lenta nunca pise a una nueva.
 *
 * El estado no se "sincroniza" dentro del efecto: cada respuesta se guarda junto a la
 * petición que la produjo y el estado visible se deriva comparándola con la actual.
 */
export function useSearch(q: string, page: number, attempt = 0): SearchState {
  const key = JSON.stringify([q, page, attempt]);
  const [outcome, setOutcome] = useState<Outcome>();

  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    search(q, page, controller.signal).then(
      (data) => setOutcome({ key, data }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setOutcome({ key, message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => controller.abort();
  }, [q, page, key]);

  if (!q) return { status: 'idle' };
  if (outcome?.key !== key) {
    return outcome && 'data' in outcome
      ? { status: 'loading', previous: outcome.data }
      : { status: 'loading' };
  }
  if ('message' in outcome) return { status: 'error', message: outcome.message };
  return { status: 'success', data: outcome.data };
}
