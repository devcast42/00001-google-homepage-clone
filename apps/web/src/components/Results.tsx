import type { SearchResponse } from '../api';
import type { SearchState } from '../hooks/useSearch';
import { Highlighted } from './Highlighted';
import { Pagination } from './Pagination';

export interface ResultsProps {
  readonly state: SearchState;
  readonly onPage: (page: number) => void;
  readonly onSearch: (query: string) => void;
  readonly onRetry: () => void;
}

const numberFormat = new Intl.NumberFormat('es');

export function Results({ state, onPage, onSearch, onRetry }: ResultsProps) {
  if (state.status === 'idle') return null;

  if (state.status === 'error') {
    return (
      <div className="notice notice--error" role="alert">
        <p>No se pudo completar la búsqueda: {state.message}</p>
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  const data: SearchResponse | undefined = state.status === 'success' ? state.data : state.previous;
  if (!data) return <ResultsSkeleton />;

  return (
    <section className="results" aria-busy={state.status === 'loading'} aria-label="Resultados">
      <p className="results__meta" role="status">
        {data.total === 0
          ? 'Sin resultados'
          : `${numberFormat.format(data.total)} resultados · página ${data.page} de ${numberFormat.format(Math.min(data.totalPages, 100))} · ${data.tookMs} ms`}
      </p>

      {data.didYouMean && (
        <p className="results__correction">
          ¿Quisiste decir{' '}
          <a
            href={`/?q=${encodeURIComponent(data.didYouMean)}`}
            onClick={(event) => {
              event.preventDefault();
              onSearch(data.didYouMean!);
            }}
          >
            {data.didYouMean}
          </a>
          ?
        </p>
      )}

      {data.total === 0 ? (
        <div className="notice">
          <p>
            No hay secciones que coincidan con <strong>{data.query}</strong>.
          </p>
          <ul>
            <li>
              Prueba con el nombre de la API: <code>readFile</code>, <code>createServer</code>.
            </li>
            <li>Usa menos palabras o términos más generales.</li>
          </ul>
        </div>
      ) : (
        <ol className="results__list" start={(data.page - 1) * data.pageSize + 1}>
          {data.results.map((hit) => (
            <li key={hit.id} className="result">
              <p className="result__path">
                <span className="result__source">
                  {hit.source === 'nodejs' ? 'Node.js' : hit.source}
                </span>
                {hit.breadcrumbs.length > 0 && <> › {hit.breadcrumbs.join(' › ')}</>}
              </p>
              <h2 className="result__title">
                <a href={hit.url}>
                  <Highlighted value={hit.title} />
                </a>
              </h2>
              <p className="result__snippet">
                <Highlighted value={hit.snippet} />
              </p>
            </li>
          ))}
        </ol>
      )}

      <Pagination page={data.page} totalPages={data.totalPages} onChange={onPage} />
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div className="results" aria-busy="true" aria-label="Cargando resultados">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="skeleton">
          <div className="skeleton__line skeleton__line--short" />
          <div className="skeleton__line skeleton__line--title" />
          <div className="skeleton__line" />
        </div>
      ))}
    </div>
  );
}
