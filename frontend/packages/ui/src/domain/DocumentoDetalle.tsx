import { DataTable } from '../data/DataTable';
import { DateTime, Money } from '../data/Money';
import { Alert } from '../primitives/Feedback';
import { PageLoader } from '../primitives/Spinner';
import { LoteStamp } from './LoteStamp';
import { Totales } from './Totales';
import type { DocumentoView } from './types';

export function DocumentoDetalle({ data, loading, error }: { data?: DocumentoView; loading: boolean; error?: string }) {
  if (loading) return <PageLoader label="Cargando detalle…" />;
  if (error) return <Alert title="No se pudo cargar el detalle">{error}</Alert>;
  if (!data) return null;
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-4 text-[0.9375rem] md:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Fecha de registro</dt>
          <dd className="font-semibold">
            <DateTime value={data.fecRegistro} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Productos</dt>
          <dd className="font-semibold">{data.cantidadItems}</dd>
        </div>
      </dl>
      <DataTable
        caption="Productos del documento"
        rows={data.detalles}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'producto',
            header: 'Producto',
            cell: (r) => (
              <span className="flex flex-col items-start gap-1">
                <span className="font-semibold">{r.productoNombre}</span>
                <LoteStamp lote={r.nroLote} />
              </span>
            ),
          },
          {
            key: 'cantidad',
            header: 'Cantidad',
            align: 'right',
            cell: (r) => r.cantidad.toLocaleString('es-PE'),
          },
          {
            key: 'precio',
            header: 'Precio unitario',
            align: 'right',
            cell: (r) => <Money value={r.precio} />,
          },
          {
            key: 'sub',
            header: 'Subtotal',
            align: 'right',
            hideBelow: 'md',
            cell: (r) => <Money value={r.subTotal} />,
          },
          {
            key: 'igv',
            header: 'IGV',
            align: 'right',
            hideBelow: 'md',
            cell: (r) => <Money value={r.igv} />,
          },
          {
            key: 'total',
            header: 'Total',
            align: 'right',
            cell: (r) => <Money value={r.total} className="font-bold" />,
          },
        ]}
      />
      <div className="flex justify-end">
        <Totales subTotal={data.subTotal} igv={data.igv} total={data.total} />
      </div>
    </div>
  );
}
