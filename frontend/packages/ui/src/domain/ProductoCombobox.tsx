'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatPEN } from '@hce/domain';
import { cn } from '../cn';
import { useModifierKeyLabel, useSearchHotkey } from '../hooks';
import { Kbd } from '../primitives/Kbd';
import { Spinner } from '../primitives/Spinner';
import { LoteStamp } from './LoteStamp';
import type { ProductoOption } from './types';

export interface ProductoComboboxProps {
  label: string;
  placeholder?: string;
  mode: 'compra' | 'venta';
  term: string;
  onTermChange: (term: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ReadonlyArray<ProductoOption>;
  loading: boolean;
  error: boolean;
  excludeIds: ReadonlyArray<number>;
  onSelect: (producto: ProductoOption) => void;
  hotkey?: boolean;
}

export function ProductoCombobox({
  label,
  placeholder = 'Nombre o lote',
  mode,
  term,
  onTermChange,
  open,
  onOpenChange,
  options,
  loading,
  error,
  excludeIds,
  onSelect,
  hotkey = false,
}: ProductoComboboxProps) {
  const [activeRaw, setActive] = useState(0);
  const active = Math.min(activeRaw, Math.max(options.length - 1, 0));
  const listId = useId();
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mod = useModifierKeyLabel();

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  useSearchHotkey(() => {
    if (!hotkey) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  });

  const yaAgregado = (p: ProductoOption) => excludeIds.includes(p.id);
  const sinStock = (p: ProductoOption) => mode === 'venta' && p.stock <= 0;
  const disabled = (p: ProductoOption) => yaAgregado(p) || sinStock(p);

  const choose = (p: ProductoOption | undefined) => {
    if (!p || disabled(p)) return;
    onTermChange('');
    onOpenChange(false);
    onSelect(p);
  };

  const status = loading
    ? 'Buscando productos'
    : error
      ? 'No se pudo cargar la lista de productos'
      : open
        ? `${options.length} ${options.length === 1 ? 'producto encontrado' : 'productos encontrados'}`
        : '';

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.5-4.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={statusId}
          aria-activedescendant={open && options[active] ? `${listId}-${options[active].id}` : undefined}
          autoComplete="off"
          maxLength={100}
          value={term}
          placeholder={placeholder}
          onChange={(e) => {
            onTermChange(e.target.value);
            onOpenChange(true);
            setActive(0);
          }}
          onFocus={() => onOpenChange(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => onOpenChange(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              onOpenChange(true);
              setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && open) {
              e.preventDefault();
              choose(options[active]);
            } else if (e.key === 'Escape') {
              onOpenChange(false);
            }
          }}
          aria-keyshortcuts={hotkey ? 'Control+K Meta+K /' : undefined}
          className="h-12 w-full rounded-md border border-line-strong bg-surface pl-9 pr-24 text-[0.9375rem] focus:border-brand-600"
        />
        {loading ? (
          <Spinner size="sm" className="absolute right-3 top-4 text-brand-600" />
        ) : (
          hotkey &&
          !term && (
            <span
              className="pointer-events-none absolute right-3 top-3 hidden items-center gap-1 sm:flex"
              aria-hidden="true"
            >
              <Kbd>{mod}</Kbd>
              <Kbd>K</Kbd>
            </span>
          )
        )}
      </div>
      <p id={statusId} aria-live="polite" className="sr-only">
        {status}
      </p>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Productos"
          className="absolute z-20 mt-1 max-h-96 w-full origin-top overflow-y-auto rounded-md border border-line-strong bg-surface py-1 shadow-[var(--shadow-overlay)] motion-safe:animate-dialog-in"
        >
          {error && <li className="px-4 py-3 text-sm text-danger">No se pudo cargar la lista de productos.</li>}
          {!error && !loading && options.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">Ningún producto coincide con la búsqueda.</li>
          )}
          {options.map((p, i) => {
            const isDisabled = disabled(p);
            return (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={isDisabled || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5',
                  i === active && 'bg-brand-50',
                  isDisabled && 'cursor-not-allowed text-muted',
                )}
              >
                <span className="flex min-w-0 flex-col items-start gap-1">
                  <span className={cn('truncate font-semibold', isDisabled ? 'text-muted' : 'text-ink')}>
                    {p.nombre}
                  </span>
                  <span className="flex items-center gap-2">
                    <LoteStamp lote={p.nroLote} />
                    {yaAgregado(p) && <span className="text-xs text-muted">Ya está en el documento</span>}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  {mode === 'venta' ? (
                    <>
                      <span className="block font-bold text-ink">{formatPEN(p.precioVenta)}</span>
                      <span className={cn('block', p.stock > 0 ? 'text-muted' : 'font-semibold text-danger')}>
                        {p.stock > 0 ? `${p.stock.toLocaleString('es-PE')} en stock` : 'Agotado'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-muted">Costo actual</span>
                      <span className="block font-bold text-ink">{formatPEN(p.costo)}</span>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
