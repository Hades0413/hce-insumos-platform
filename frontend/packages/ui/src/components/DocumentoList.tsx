'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { CompraDetalleDto, DocumentoQuery, DocumentoResumenDto, Paginated } from '@hce/api-client';
import { DataTable, Pagination } from './DataTable';
import { DateTime, Money } from './Money';
import { Alert } from './Feedback';
import { Button } from './Button';
import { Input } from './Field';
import { Modal } from './Modal';
import { DocumentoDetalle } from './DocumentoDetalle';

export interface DocumentoListProps {
  /** 'compras' | 'ventas' — también es la raíz de la query key. */
  resource: 'compras' | 'ventas';
  titulo: string;
  listar: (q: DocumentoQuery) => Promise<Paginated<DocumentoResumenDto>>;
  obtener: (id: number) => Promise<CompraDetalleDto>;
}

const PAGE_SIZE = 20;

/** Historial paginado con filtros de fecha y modal de detalle (reutilizado por compras y ventas). */
export function DocumentoList({ resource, titulo, listar, obtener }: DocumentoListProps) {
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string }>({});
  const [draft, setDraft] = useState<{ desde: string; hasta: string }>({ desde: '', hasta: '' });
  const [selected, setSelected] = useState<number | null>(null);

  const q: DocumentoQuery = { page, pageSize: PAGE_SIZE, ...filtros };
  const list = useQuery({
    queryKey: [resource, 'list', q],
    queryFn: () => listar(q),
    placeholderData: keepPreviousData,
  });
  const detail = useQuery({
    queryKey: [resource, 'detail', selected],
    queryFn: () => obtener(selected!),
    enabled: selected !== null,
  });

  const rangoInvalido = !!draft.desde && !!draft.hasta && draft.desde > draft.hasta;

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (rangoInvalido) return;
          setPage(1);
          setFiltros({ desde: draft.desde || undefined, hasta: draft.hasta || undefined });
        }}
      >
        <Input type="date" label="Desde" value={draft.desde} max={draft.hasta || undefined} onChange={(e) => setDraft((d) => ({ ...d, desde: e.target.value }))} containerClassName="w-44" />
        <Input type="date" label="Hasta" value={draft.hasta} min={draft.desde || undefined} onChange={(e) => setDraft((d) => ({ ...d, hasta: e.target.value }))} containerClassName="w-44" error={rangoInvalido ? 'Rango inválido' : undefined} />
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {(filtros.desde || filtros.hasta) && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft({ desde: '', hasta: '' });
              setFiltros({});
              setPage(1);
            }}
          >
            Limpiar
          </Button>
        )}
      </form>

      {list.error && <Alert title={`No se pudo cargar ${titulo.toLowerCase()}`}>{list.error.message}</Alert>}

      <DataTable
        caption={titulo}
        rows={list.data?.items}
        loading={list.isFetching}
        rowKey={(r) => r.id}
        empty="No hay documentos en el rango seleccionado."
        columns={[
          { key: 'id', header: 'N.º', cell: (r) => <span className="font-semibold">{r.id}</span> },
          { key: 'fecha', header: 'Fecha registro', cell: (r) => <DateTime value={r.fecRegistro} /> },
          { key: 'items', header: 'Ítems', align: 'right', hideBelow: 'sm', cell: (r) => r.cantidadItems },
          { key: 'sub', header: 'Subtotal', align: 'right', hideBelow: 'md', cell: (r) => <Money value={r.subTotal} /> },
          { key: 'igv', header: 'IGV', align: 'right', hideBelow: 'md', cell: (r) => <Money value={r.igv} /> },
          { key: 'total', header: 'Total', align: 'right', cell: (r) => <Money value={r.total} className="font-semibold" /> },
          {
            key: 'acc',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cell: (r) => (
              <Button size="sm" variant="secondary" onClick={() => setSelected(r.id)}>
                Ver detalle
              </Button>
            ),
          },
        ]}
      />
      {list.data && <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPageChange={setPage} />}

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={`Detalle ${resource === 'compras' ? 'de compra' : 'de venta'} N.º ${selected ?? ''}`} size="lg">
        <DocumentoDetalle data={detail.data} isLoading={detail.isPending} error={detail.error} />
      </Modal>
    </div>
  );
}
