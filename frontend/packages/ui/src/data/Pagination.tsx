export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    'h-11 rounded-md border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-brand-600 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Anterior
        </button>
        <span className="px-2 tabular-nums">
          Página {page} de {totalPages}
        </span>
        <button type="button" className={btn} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
