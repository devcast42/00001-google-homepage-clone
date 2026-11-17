import { useCallback, useEffect, useState } from 'react';
import type { Suggestion } from '@docseek/engine';
import { Logo } from './components/Logo';
import { Results } from './components/Results';
import { SearchBox } from './components/SearchBox';
import { ThemeToggle } from './components/ThemeToggle';
import { useSearch } from './hooks/useSearch';
import { useTheme } from './hooks/useTheme';
import { useUrlState } from './hooks/useUrlState';

const EXAMPLES = ['readFile', 'create http server', 'promisify', 'stream pipeline', 'random uuid'];

export interface AppProps {
  /** Inyectable para pruebas; por defecto navega a la documentación. */
  readonly openUrl?: (url: string) => void;
}

export function App({ openUrl = (url) => window.location.assign(url) }: AppProps) {
  const [{ q, page }, navigate] = useUrlState();
  const [attempt, setAttempt] = useState(0);
  const state = useSearch(q, page, attempt);
  const [theme, toggleTheme] = useTheme();

  const runSearch = useCallback((query: string) => navigate({ q: query, page: 1 }), [navigate]);
  const openSuggestion = useCallback(
    (suggestion: Suggestion) => openUrl(suggestion.url),
    [openUrl],
  );

  useEffect(() => {
    document.title = q ? `${q} — DocSeek` : 'DocSeek — buscador de documentación técnica';
  }, [q]);

  useEffect(() => {
    if (state.status === 'success') window.scrollTo({ top: 0 });
  }, [state.status, page]);

  if (!q) {
    return (
      <div className="home">
        <header className="topbar topbar--home">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <main className="home__main">
          <h1 className="home__title">
            <Logo />
          </h1>
          <p className="home__tagline">
            Busca en las 5.000 secciones de la documentación de Node.js al instante.
          </p>
          <SearchBox initialValue="" onSearch={runSearch} onOpen={openSuggestion} autoFocus />
          <p className="home__examples">
            Prueba:{' '}
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="chip"
                onClick={() => runSearch(example)}
              >
                {example}
              </button>
            ))}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <a
          href="/"
          className="topbar__logo"
          aria-label="DocSeek, inicio"
          onClick={(event) => {
            event.preventDefault();
            navigate({ q: '', page: 1 });
          }}
        >
          <Logo size="small" />
        </a>
        <SearchBox key={q} initialValue={q} onSearch={runSearch} onOpen={openSuggestion} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <main className="page__main">
        <Results
          state={state}
          onPage={(next) => navigate({ q, page: next })}
          onSearch={runSearch}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>
        Contenido de{' '}
        <a href="https://nodejs.org/api/" rel="noreferrer">
          nodejs.org/api
        </a>{' '}
        (licencia MIT)
      </span>
      <span>
        <a href="/api/stats">API</a> ·{' '}
        <a href="https://github.com/devcast42/00001-google-homepage-clone" rel="noreferrer">
          Código fuente
        </a>
      </span>
    </footer>
  );
}
