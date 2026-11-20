'use client';

import { useRef, useState } from 'react';
import { api, type KardexItemDto } from '@hce/api-client';
import { queryKeys, usePaginatedQuery } from '@hce/api-client/react';
import { errorMessage } from '@hce/features';
import {
  Alert,
  Button,
  DataTable,
  Input,
  Kbd,
  LoteStamp,
  Money,
  Pagination,
  StockLevel,
  useDebouncedValue,
  useSearchHotkey,
} from '@hce/ui';
import { MovimientosModal } from './MovimientosModal';

const PAGE_SIZE = 20;

const ROW_ACTION =
  'transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';

export function KardexView() {
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<KardexItemDto | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useDebouncedValue(term.trim(), 250);
  useSearchHotkey(() => searchRef.current?.focus());

  const list = usePaginatedQuery({
    queryKey: (page) => queryKeys.kardex.list({ search, page, pageSize: PAGE_SIZE }),
    queryFn: (page) => api.kardex.listar({ search, page, pageSize: PAGE_SIZE }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <Input
          ref={searchRef}
          type="search"
          label="Buscar producto"
          placeholder="Nombre o lote"
          maxLength={100}
          value={term}
          aria-keyshortcuts="/ Control+K Meta+K"
          onChange={(e) => {
            setTerm(e.target.value);
            list.resetPage();
          }}
          containerClassName="w-full max-w-md"
        />
        <p className="mb-3 hidden items-center gap-1.5 text-sm text-muted md:flex">
          <Kbd>/</Kbd> para buscar
        </p>
      </div>
      {list.error && <Alert title="No se pudo cargar el kardex">{errorMessage(list.error)}</Alert>}
      {!(list.error && !list.data) && (
        <DataTable
          caption="Kardex de productos"
          rows={list.data?.items}
          loading={list.isFetching}
          rowKey={(r) => r.productoId}
          empty={search ? 'Ningún producto coincide con la búsqueda.' : 'Aún no hay productos registrados.'}
          columns={[
            {
              key: 'id',
              header: 'Id',
              cell: (r) => <span className="tabular-nums text-muted">{r.productoId}</span>,
            },
            {
              key: 'nombre',
              header: 'Producto',
              cell: (r) => (
                <span className="flex flex-col items-start gap-1">
                  <span className="font-semibold">{r.nombreProducto}</span>
                  <LoteStamp lote={r.nroLote} />
                </span>
              ),
            },
            {
              key: 'stock',
              header: 'Stock actual',
              align: 'right',
              cell: (r) => <StockLevel stock={r.stockActual} />,
            },
            {
              key: 'costo',
              header: 'Costo',
              align: 'right',
              cell: (r) => <Money value={r.costo} />,
            },
            {
              key: 'pv',
              header: 'Precio de venta',
              align: 'right',
              cell: (r) => <Money value={r.precioVenta} />,
            },
            {
              key: 'acc',
              header: <span className="sr-only">Acciones</span>,
              align: 'right',
              cell: (r) => (
                <Button
                  size="sm"
                  variant="secondary"
                  className={ROW_ACTION}
                  onClick={() => setSelected(r)}
                  aria-label={`Ver movimientos de ${r.nombreProducto}`}
                >
                  Ver movimientos
                </Button>
              ),
            },
          ]}
        />
      )}
      {list.data && list.data.total > 0 && (
        <Pagination page={list.page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={list.setPage} />
      )}
      <MovimientosModal producto={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
