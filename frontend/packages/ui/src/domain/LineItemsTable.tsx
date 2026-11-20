import type { ReactNode } from 'react';
import { cn } from '../cn';
import { ALIGN, TH } from '../data/DataTable';
import { Money } from '../data/Money';

export const WIDE_ONLY = 'hidden lg:table-cell';

export interface LineColumn {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function LineItemsTable({
  caption,
  columns,
  children,
}: {
  caption: string;
  columns: ReadonlyArray<LineColumn>;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[600px] lg:min-w-[760px] border-collapse text-[0.9375rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line-strong bg-canvas">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn(TH, 'px-3', ALIGN[c.align ?? 'left'], c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function LineCell({
  children,
  align = 'left',
  className,
}: {
  children?: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return <td className={cn('border-t border-line px-3 py-3 align-top', ALIGN[align], className)}>{children}</td>;
}

export function LineAmountsCells({
  linea,
  igvLabel,
}: {
  linea: { subTotal: number; igv: number; total: number };
  igvLabel: string;
}) {
  return (
    <>
      <LineCell align="right" className={WIDE_ONLY}>
        <Money value={linea.subTotal} />
      </LineCell>
      <LineCell align="right" className={WIDE_ONLY}>
        <Money value={linea.igv} />
      </LineCell>
      <LineCell align="right">
        <Money value={linea.total} className="font-bold" />
        <dl className="mt-1 grid grid-cols-[auto_auto] justify-end gap-x-2 whitespace-nowrap text-xs text-muted lg:hidden">
          <dt>Subtotal</dt>
          <dd>
            <Money value={linea.subTotal} />
          </dd>
          <dt>{igvLabel}</dt>
          <dd>
            <Money value={linea.igv} />
          </dd>
        </dl>
      </LineCell>
    </>
  );
}

export function RemoveLineButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-danger-bg hover:text-danger"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />
      </svg>
    </button>
  );
}

export function ProductoCell({ nombre, lote }: { nombre: string; lote: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-semibold text-ink">{nombre}</span>
      {lote}
    </div>
  );
}
