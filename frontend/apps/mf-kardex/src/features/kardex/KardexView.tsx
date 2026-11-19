'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type KardexItemDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { Alert, Badge, Button, DataTable, Input, Money, Pagination, useDebouncedValue } from '@hce/ui';
import { MovimientosModal } from './MovimientosModal';

const PAGE_SIZE = 20;

/** Kardex (PDF 1.2.3): stock actual derivado de la tabla de movimientos. */
export function KardexView() {
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<KardexItemDto | null>(null);
  const search = useDebouncedValue(term.trim(), 300);
  const q = { search, page, pageSize: PAGE_SIZE };

  const { data, error, isFetching } = useQuery({
    queryKey: queryKeys.kardex.list(q),
    queryFn: () => api.kardex.listar(q),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        label="Buscar producto"
        placeholder="Nombre o lote…"
        maxLength={100}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setPage(1);
        }}
        containerClassName="max-w-md"
      />
      {error && <Alert title="No se pudo cargar el kardex">{error.message}</Alert>}
      <DataTable
        caption="Kardex de productos"
        rows={data?.items}
        loading={isFetching}
        rowKey={(r) => r.productoId}
        empty={search ? 'Sin coincidencias para la búsqueda.' : 'No hay productos registrados.'}
        columns={[
          { key: 'id', header: 'Id producto', cell: (r) => <span className="font-semibold">{r.productoId}</span> },
          {
            key: 'nombre',
            header: 'Nombre producto',
            cell: (r) => (
              <>
                <span className="font-medium">{r.nombreProducto}</span>
                <span className="block text-xs text-muted">Lote {r.nroLote}</span>
              </>
            ),
          },
          {
            key: 'stock',
            header: 'Stock actual',
            align: 'right',
            cell: (r) => <Badge tone={r.stockActual === 0 ? 'danger' : r.stockActual < 10 ? 'warn' : 'ok'}>{r.stockActual}</Badge>,
          },
          { key: 'costo', header: 'Costo', align: 'right', cell: (r) => <Money value={r.costo} /> },
          { key: 'pv', header: 'Precio venta', align: 'right', cell: (r) => <Money value={r.precioVenta} /> },
          {
            key: 'acc',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cell: (r) => (
              <Button size="sm" variant="secondary" onClick={() => setSelected(r)} aria-label={`Ver movimientos de ${r.nombreProducto}`}>
                Ver movimientos
              </Button>
            ),
          },
        ]}
      />
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
      <MovimientosModal producto={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
