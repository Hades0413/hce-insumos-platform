'use client';

import type { CompraDetalleDto } from '@hce/api-client';
import { DataTable } from './DataTable';
import { DateTime, Money } from './Money';
import { Alert } from './Feedback';
import { PageLoader } from './Spinner';

/** Detalle de una compra o venta (misma forma de DTO). */
export function DocumentoDetalle({ data, isLoading, error }: { data?: CompraDetalleDto; isLoading: boolean; error?: Error | null }) {
  if (isLoading) return <PageLoader />;
  if (error) return <Alert title="No se pudo cargar el detalle">{error.message}</Alert>;
  if (!data) return null;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <dt className="text-muted">N.º</dt>
          <dd className="font-semibold">{data.id}</dd>
        </div>
        <div>
          <dt className="text-muted">Fecha</dt>
          <dd className="font-semibold">
            <DateTime value={data.fecRegistro} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ítems</dt>
          <dd className="font-semibold">{data.cantidadItems}</dd>
        </div>
        <div>
          <dt className="text-muted">Total</dt>
          <dd className="font-semibold">
            <Money value={data.total} />
          </dd>
        </div>
      </dl>
      <DataTable
        caption="Detalle del documento"
        rows={data.detalles}
        rowKey={(r) => r.id}
        columns={[
          { key: 'producto', header: 'Producto', cell: (r) => (<><span className="font-medium">{r.productoNombre}</span><span className="block text-xs text-muted">Lote {r.nroLote}</span></>) },
          { key: 'cantidad', header: 'Cant.', align: 'right', cell: (r) => r.cantidad },
          { key: 'precio', header: 'Precio', align: 'right', cell: (r) => <Money value={r.precio} /> },
          { key: 'sub', header: 'Subtotal', align: 'right', hideBelow: 'md', cell: (r) => <Money value={r.subTotal} /> },
          { key: 'igv', header: 'IGV', align: 'right', hideBelow: 'md', cell: (r) => <Money value={r.igv} /> },
          { key: 'total', header: 'Total', align: 'right', cell: (r) => <Money value={r.total} className="font-semibold" /> },
        ]}
      />
      <Totales subTotal={data.subTotal} igv={data.igv} total={data.total} />
    </div>
  );
}

export function Totales({ subTotal, igv, total }: { subTotal: number; igv: number; total: number }) {
  return (
    <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
      <dt className="text-muted">Subtotal</dt>
      <dd className="text-right">
        <Money value={subTotal} />
      </dd>
      <dt className="text-muted">IGV (18%)</dt>
      <dd className="text-right">
        <Money value={igv} />
      </dd>
      <dt className="border-t border-line pt-1 font-semibold">Total</dt>
      <dd className="border-t border-line pt-1 text-right text-base font-bold">
        <Money value={total} />
      </dd>
    </dl>
  );
}
