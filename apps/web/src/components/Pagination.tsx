export interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly onChange: (page: number) => void;
}

const MAX_PAGES = 100;
const WINDOW = 2;

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const last = Math.min(totalPages, MAX_PAGES);
  if (last <= 1) return null;

  const pages: number[] = [];
  for (let p = Math.max(1, page - WINDOW); p <= Math.min(last, page + WINDOW); p++) pages.push(p);

  return (
    <nav className="pagination" aria-label="Paginación">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        ‹ Anterior
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className="pagination__page"
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= last}>
        Siguiente ›
      </button>
    </nav>
  );
}
