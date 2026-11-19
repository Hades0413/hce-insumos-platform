'use client';

import { useQuery } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { api, type ProductoDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { formatPEN } from '@hce/domain';
import { cn } from '../cn';
import { useDebouncedValue } from '../hooks';
import { Spinner } from './Spinner';

export interface ProductoPickerProps {
  onSelect: (producto: ProductoDto) => void;
  /** IDs ya agregados (se muestran deshabilitados para evitar líneas duplicadas). */
  excludeIds?: ReadonlyArray<number>;
  /** Mostrar stock y precio de venta (vista ventas) o costo (vista compras). */
  mode: 'compra' | 'venta';
  label?: string;
  placeholder?: string;
}

/**
 * Combobox accesible (WAI-ARIA 1.2) con búsqueda en servidor, debounce y caché.
 */
export function ProductoPicker({ onSelect, excludeIds = [], mode, label = 'Buscar producto', placeholder = 'Nombre o lote…' }: ProductoPickerProps) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const search = useDebouncedValue(term.trim(), 300);
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const query = { search, page: 1, pageSize: 10 };
  const { data, isFetching, isError } = useQuery({
    queryKey: queryKeys.productos.list(query),
    queryFn: () => api.productos.listar(query),
    enabled: open,
    staleTime: 10_000,
  });

  const options = data?.items ?? [];

  const choose = (p: ProductoDto) => {
    if (excludeIds.includes(p.id)) return;
    if (mode === 'venta' && p.stock <= 0) return;
    onSelect(p);
    setTerm('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const isDisabled = (p: ProductoDto) => excludeIds.includes(p.id) || (mode === 'venta' && p.stock <= 0);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${options[active].id}` : undefined}
          autoComplete="off"
          maxLength={100}
          value={term}
          placeholder={placeholder}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && open && options[active]) {
              e.preventDefault();
              choose(options[active]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="h-11 w-full rounded-lg border border-line bg-surface pl-3 pr-10 text-sm focus:border-brand-500"
        />
        {isFetching && <Spinner size="sm" className="absolute right-3 top-3.5" />}
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label="Productos" className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-card">
          {isError && <li className="px-3 py-2 text-sm text-danger">No se pudo cargar productos.</li>}
          {!isError && !isFetching && options.length === 0 && <li className="px-3 py-2 text-sm text-muted">Sin resultados.</li>}
          {options.map((p, i) => {
            const disabled = isDisabled(p);
            return (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm',
                  i === active && 'bg-brand-50',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{p.nombre}</span>
                  <span className="block text-xs text-muted">
                    Lote {p.nroLote} · ID {p.id}
                    {excludeIds.includes(p.id) && ' · ya agregado'}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  {mode === 'venta' ? (
                    <>
                      <span className="block font-semibold text-ink">{formatPEN(p.precioVenta)}</span>
                      <span className={cn('block', p.stock > 0 ? 'text-ok' : 'text-danger')}>Stock: {p.stock}</span>
                    </>
                  ) : (
                    <>
                      <span className="block text-muted">Costo actual</span>
                      <span className="block font-semibold text-ink">{formatPEN(p.costo)}</span>
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
