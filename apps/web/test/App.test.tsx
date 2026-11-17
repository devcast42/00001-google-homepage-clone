import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import type { SearchResponse } from '../src/api';

function response(
  query: string,
  page: number,
  overrides: Partial<SearchResponse> = {},
): SearchResponse {
  return {
    query,
    page,
    pageSize: 10,
    total: 25,
    totalPages: 3,
    tookMs: 1.5,
    results: [
      {
        id: `r-${page}`,
        url: 'https://nodejs.org/api/fs.html#fsreadfile',
        source: 'nodejs',
        breadcrumbs: ['File system'],
        title: { text: `fs.readFile() — página ${page}`, highlights: [[3, 11]] },
        snippet: { text: 'Reads the entire contents of a file.', highlights: [[0, 5]] },
        score: 1,
      },
    ],
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    if (url.pathname === '/api/suggest') return Response.json({ query: '', suggestions: [] });
    const q = url.searchParams.get('q')!;
    const page = Number(url.searchParams.get('page'));
    if (q === 'boom')
      return Response.json(
        { error: { code: 'internal', message: 'Error interno' } },
        { status: 500 },
      );
    if (q === 'readFiel') return Response.json(response(q, page, { didYouMean: 'readFile' }));
    return Response.json(response(q, page));
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('scrollTo', () => {});
});

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('searches from the home page and keeps the query in the URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('combobox'), 'readFile{Enter}');
    expect(
      await screen.findByRole('link', { name: /fs\.readFile\(\) — página 1/ }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('?q=readFile');
    expect(screen.getByRole('status')).toHaveTextContent('25 resultados · página 1 de 3 · 1.5 ms');
    expect(document.title).toBe('readFile — DocSeek');
  });

  it('restores the search from the URL and paginates', async () => {
    window.history.replaceState(null, '', '/?q=stream&page=2');
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText(/página 2$/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '3' }));
    expect(await screen.findByText(/página 3$/)).toBeInTheDocument();
    expect(window.location.search).toBe('?q=stream&page=3');
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
  });

  it('follows the "did you mean" suggestion', async () => {
    window.history.replaceState(null, '', '/?q=readFiel');
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('link', { name: 'readFile' }));
    await waitFor(() => expect(window.location.search).toBe('?q=readFile'));
  });

  it('shows an error with a retry button', async () => {
    window.history.replaceState(null, '', '/?q=boom');
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno');
    const calls = fetchMock.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(calls + 1));
  });

  it('goes back to the home page from the logo', async () => {
    window.history.replaceState(null, '', '/?q=stream');
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'DocSeek, inicio' }));
    expect(window.location.search).toBe('');
    expect(screen.getByText(/5\.000 secciones/)).toBeInTheDocument();
  });
});
