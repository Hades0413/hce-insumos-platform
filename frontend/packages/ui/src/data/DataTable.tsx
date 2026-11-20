import type { ReactNode } from 'react';
import { cn } from '../cn';
import { Spinner } from '../primitives/Spinner';
import { SkeletonTable } from './SkeletonTable';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  hideBelow?: 'sm' | 'md' | 'lg';
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  rows: ReadonlyArray<T> | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  empty?: ReactNode;
  caption: string;
}

export const HIDE_BELOW = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;
export const ALIGN = {
  left: 'text-left',
  right: 'text-right tabular-nums',
  center: 'text-center',
} as const;
export const TH = 'px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap text-muted';

export function DataTable<T>({ columns, rows, rowKey, loading, empty, caption }: DataTableProps<T>) {
  if (loading && !rows) return <SkeletonTable columns={Math.min(columns.length, 6)} />;
  return (
    <div className="relative overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[560px] border-collapse text-[0.9375rem]" aria-busy={loading || undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line-strong bg-canvas">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(TH, ALIGN[c.align ?? 'left'], c.hideBelow && HIDE_BELOW[c.hideBelow], c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => (
            <tr
              key={rowKey(row)}
              className="group border-t border-line first:border-t-0 hover:bg-brand-50/50 focus-within:bg-brand-50/50"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-4 py-3 align-middle',
                    ALIGN[c.align ?? 'left'],
                    c.hideBelow && HIDE_BELOW[c.hideBelow],
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
          {!loading && rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-muted">
                {empty ?? 'Sin registros.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/60" aria-hidden="true">
          <Spinner className="text-brand-600" />
        </div>
      )}
    </div>
  );
}
