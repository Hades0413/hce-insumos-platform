'use client';

import { useState, type ReactNode } from 'react';
import { DataTable } from '../data/DataTable';
import { DateTime, Money } from '../data/Money';
import { Pagination } from '../data/Pagination';
import { Alert } from '../primitives/Feedback';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Field';
import type { DocumentoResumenView } from './types';

export interface RangoFechas {
  desde?: string;
  hasta?: string;
}

export interface DocumentoHistorialViewProps {
  documento: 'compra' | 'venta';
  rows?: ReadonlyArray<DocumentoResumenView>;
  loading: boolean;
  error?: string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  filtrosActivos: boolean;
  onFiltrar: (rango: RangoFechas) => void;
  onVerDetalle: (id: number) => void;
  detalle?: ReactNode;
}

export function DocumentoHistorialView(props: DocumentoHistorialViewProps) {
  const {
    documento,
    rows,
    loading,
    error,
    page,
    pageSize,
    total,
    onPageChange,
    filtrosActivos,
    onFiltrar,
    onVerDetalle,
    detalle,
  } = props;
  const [draft, setDraft] = useState({ desde: '', hasta: '' });
  const rangoInvalido = !!draft.desde && !!draft.hasta && draft.desde > draft.hasta;
  const plural = documento === 'compra' ? 'compras' : 'ventas';

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!rangoInvalido)
            onFiltrar({
              desde: draft.desde || undefined,
              hasta: draft.hasta || undefined,
            });
        }}
      >
        <Input
          type="date"
          label="Desde"
          value={draft.desde}
          max={draft.hasta || undefined}
          onChange={(e) => setDraft((d) => ({ ...d, desde: e.target.value }))}
          containerClassName="w-48"
        />
        <Input
          type="date"
          label="Hasta"
          value={draft.hasta}
          min={draft.desde || undefined}
          onChange={(e) => setDraft((d) => ({ ...d, hasta: e.target.value }))}
          containerClassName="w-48"
          error={rangoInvalido ? 'Debe ser posterior a "desde"' : undefined}
        />
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {filtrosActivos && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft({ desde: '', hasta: '' });
              onFiltrar({});
            }}
          >
            Quitar filtro
          </Button>
        )}
      </form>

      {error && <Alert title={`No se pudieron cargar las ${plural}`}>{error}</Alert>}

      <DataTable
        caption={`Historial de ${plural}`}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        empty={filtrosActivos ? `No hay ${plural} entre esas fechas.` : `Aún no se registraron ${plural}.`}
        columns={[
          {
            key: 'id',
            header: 'N.º',
            cell: (r) => <span className="font-bold tabular-nums">{r.id}</span>,
          },
          {
            key: 'fecha',
            header: 'Fecha de registro',
            cell: (r) => <DateTime value={r.fecRegistro} />,
          },
          {
            key: 'items',
            header: 'Productos',
            align: 'right',
            hideBelow: 'sm',
            cell: (r) => r.cantidadItems,
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
          {
            key: 'acc',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cell: (r) => (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onVerDetalle(r.id)}
                aria-label={`Ver detalle de la ${documento} ${r.id}`}
              >
                Ver detalle
              </Button>
            ),
          },
        ]}
      />
      {total > 0 && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />}
      {detalle}
    </div>
  );
}
