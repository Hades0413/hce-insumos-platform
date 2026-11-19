import type { ReactNode } from 'react';
import { cn } from '../cn';
import { Spinner } from './Spinner';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Ocultar en pantallas angostas (tablet vertical). */
  hideBelow?: 'sm' | 'md' | 'lg';
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  rows: ReadonlyArray<T> | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  empty?: ReactNode;
  caption?: string;
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const;
const ALIGN = { left: 'text-left', right: 'text-right tabular-nums', center: 'text-center' } as const;

export function DataTable<T>({ columns, rows, rowKey, loading, empty, caption }: DataTableProps<T>) {
  return (
    <div className="relative overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', ALIGN[c.align ?? 'left'], c.hideBelow && HIDE[c.hideBelow], c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => (
            <tr key={rowKey(row)} className="border-t border-line hover:bg-brand-50/40">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 align-middle', ALIGN[c.align ?? 'left'], c.hideBelow && HIDE[c.hideBelow], c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
          {!loading && rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {empty ?? 'Sin registros.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/60" aria-busy="true">
          <Spinner />
        </div>
      )}
      {loading && !rows && <div className="h-40" />}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = 'h-10 min-w-10 rounded-lg border border-line bg-surface px-3 text-sm hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        Mostrando <span className="font-semibold text-ink">{from}</span>–<span className="font-semibold text-ink">{to}</span> de{' '}
        <span className="font-semibold text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
          ‹ Anterior
        </button>
        <span aria-current="page" className="px-2">
          Página {page} de {totalPages}
        </span>
        <button type="button" className={btn} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente">
          Siguiente ›
        </button>
      </div>
    </nav>
  );
}
