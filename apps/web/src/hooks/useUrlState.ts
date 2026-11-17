import { useCallback, useEffect, useState } from 'react';

export interface UrlState {
  readonly q: string;
  readonly page: number;
}

function read(): UrlState {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() ?? '',
    page: Number.isInteger(page) && page >= 1 && page <= 100 ? page : 1,
  };
}

/**
 * La consulta y la página viven en la URL (`/?q=readFile&page=2`): así una búsqueda se
 * puede compartir, recargar y recorrer con los botones atrás/adelante del navegador.
 */
export function useUrlState(): [UrlState, (next: UrlState) => void] {
  const [state, setState] = useState(read);

  useEffect(() => {
    const onPopState = () => setState(read());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: UrlState) => {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.q && next.page > 1) params.set('page', String(next.page));
    const url = params.size > 0 ? `/?${params}` : '/';
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, '', url);
    }
    setState({ q: next.q, page: next.page });
  }, []);

  return [state, navigate];
}
