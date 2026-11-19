'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type KardexItemDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { Alert, Badge, DataTable, DateTime, Modal, Money, Pagination } from '@hce/ui';

const PAGE_SIZE = 10;

/** Movimientos (compras = ENTRADA, ventas = SALIDA) de un producto, con saldo acumulado. */
export function MovimientosModal({ producto, onClose }: { producto: KardexItemDto | null; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const productoId = producto?.productoId ?? 0;
  const q = { page, pageSize: PAGE_SIZE };

  const { data, error, isFetching } = useQuery({
    queryKey: queryKeys.kardex.movimientos(productoId, q),
    queryFn: () => api.kardex.movimientos(productoId, q),
    enabled: producto !== null,
    placeholderData: keepPreviousData,
  });

  const close = () => {
    setPage(1);
    onClose();
  };

  return (
    <Modal open={producto !== null} onClose={close} size="lg" title={`Movimientos · ${producto?.nombreProducto ?? ''}`} description={producto ? `ID ${producto.productoId} · Lote ${producto.nroLote}` : undefined}>
      {producto && (
        <dl className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-canvas p-3 text-sm">
          <div>
            <dt className="text-muted">Stock actual</dt>
            <dd className="text-lg font-bold">{data?.producto.stockActual ?? producto.stockActual}</dd>
          </div>
          <div>
            <dt className="text-muted">Costo</dt>
            <dd className="font-semibold"><Money value={producto.costo} /></dd>
          </div>
          <div>
            <dt className="text-muted">Precio venta</dt>
            <dd className="font-semibold"><Money value={producto.precioVenta} /></dd>
          </div>
        </dl>
      )}
      {error && <Alert title="No se pudieron cargar los movimientos">{error.message}</Alert>}
      <DataTable
        caption="Movimientos del producto"
        rows={data?.items}
        loading={isFetching}
        rowKey={(m) => `${m.movimientoId}-${m.idTipoMovimiento}`}
        empty="Este producto aún no tiene movimientos."
        columns={[
          { key: 'fecha', header: 'Fecha registro', cell: (m) => <DateTime value={m.fecRegistro} /> },
          {
            key: 'tipo',
            header: 'Tipo movimiento',
            cell: (m) => <Badge tone={m.tipoMovimiento === 'ENTRADA' ? 'ok' : 'danger'}>{m.tipoMovimiento}</Badge>,
          },
          { key: 'doc', header: 'Documento', hideBelow: 'sm', cell: (m) => `${m.tipoMovimiento === 'ENTRADA' ? 'Compra' : 'Venta'} N.º ${m.documentoOrigenId}` },
          {
            key: 'cant',
            header: 'Cantidad',
            align: 'right',
            cell: (m) => <span className={m.tipoMovimiento === 'ENTRADA' ? 'text-ok' : 'text-danger'}>{m.tipoMovimiento === 'ENTRADA' ? '+' : '−'}{m.cantidad}</span>,
          },
          { key: 'saldo', header: 'Saldo', align: 'right', cell: (m) => <span className="font-semibold">{m.saldo}</span> },
        ]}
      />
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
    </Modal>
  );
}
