'use client';

import { api, type KardexItemDto, type MovimientoDto } from '@hce/api-client';
import { queryKeys, usePaginatedQuery } from '@hce/api-client/react';
import { errorMessage } from '@hce/features';
import { Alert, Badge, DataTable, DateTime, LoteStamp, Modal, Money, Pagination, StepChart, StockLevel } from '@hce/ui';

const PAGE_SIZE = 10;

const esEntrada = (m: MovimientoDto) => m.tipoMovimiento === 'ENTRADA';

export function MovimientosModal({ producto, onClose }: { producto: KardexItemDto | null; onClose: () => void }) {
  const productoId = producto?.productoId ?? 0;
  const movimientos = usePaginatedQuery({
    queryKey: (page) => queryKeys.kardex.movimientos(productoId, { page, pageSize: PAGE_SIZE }),
    queryFn: (page) => api.kardex.movimientos(productoId, { page, pageSize: PAGE_SIZE }),
    enabled: producto !== null,
  });
  const data = movimientos.data;
  const serie = [...(data?.items ?? [])].reverse().map((m) => ({ fecha: m.fecRegistro, saldo: m.saldo }));

  const close = () => {
    movimientos.resetPage();
    onClose();
  };

  return (
    <Modal
      open={producto !== null}
      onClose={close}
      size="lg"
      title={producto?.nombreProducto ?? 'Movimientos'}
      description={producto && <LoteStamp lote={producto.nroLote} />}
    >
      {producto && (
        <div className="mb-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
          <dl className="grid grid-cols-3 gap-6 text-[0.9375rem]">
            <div>
              <dt className="text-sm text-muted">Stock actual</dt>
              <dd className="text-2xl">
                <StockLevel stock={data?.producto.stockActual ?? producto.stockActual} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Costo</dt>
              <dd className="pt-1.5 font-semibold">
                <Money value={producto.costo} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Precio de venta</dt>
              <dd className="pt-1.5 font-semibold">
                <Money value={producto.precioVenta} />
              </dd>
            </div>
          </dl>
          <StepChart points={serie} label={`Evolución del saldo en los ${serie.length} movimientos mostrados`} />
        </div>
      )}
      {movimientos.error && (
        <Alert title="No se pudieron cargar los movimientos">{errorMessage(movimientos.error)}</Alert>
      )}
      <DataTable
        caption="Movimientos del producto"
        rows={data?.items}
        loading={movimientos.isFetching}
        rowKey={(m) => `${m.movimientoId}-${m.idTipoMovimiento}`}
        empty="Este producto aún no tiene movimientos."
        columns={[
          {
            key: 'fecha',
            header: 'Fecha de registro',
            cell: (m) => <DateTime value={m.fecRegistro} />,
          },
          {
            key: 'tipo',
            header: 'Movimiento',
            cell: (m) => <Badge tone={esEntrada(m) ? 'ok' : 'warn'}>{esEntrada(m) ? 'Entrada' : 'Salida'}</Badge>,
          },
          {
            key: 'doc',
            header: 'Documento',
            hideBelow: 'sm',
            cell: (m) => (
              <span className="text-muted">{`${esEntrada(m) ? 'Compra' : 'Venta'} N.º ${m.documentoOrigenId}`}</span>
            ),
          },
          {
            key: 'cant',
            header: 'Cantidad',
            align: 'right',
            cell: (m) => (
              <span className={esEntrada(m) ? 'font-semibold text-ok' : 'font-semibold text-warn'}>
                {esEntrada(m) ? '+' : '−'}
                {m.cantidad.toLocaleString('es-PE')}
              </span>
            ),
          },
          {
            key: 'saldo',
            header: 'Saldo',
            align: 'right',
            cell: (m) => <span className="font-bold">{m.saldo.toLocaleString('es-PE')}</span>,
          },
        ]}
      />
      {data && data.total > PAGE_SIZE && (
        <Pagination
          page={movimientos.page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={movimientos.setPage}
        />
      )}
    </Modal>
  );
}
