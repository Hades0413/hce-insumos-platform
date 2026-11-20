'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type DocumentoQuery } from '@hce/api-client';
import { queryKeys, usePaginatedQuery } from '@hce/api-client/react';
import { DocumentoDetalle, DocumentoHistorialView, Modal, type RangoFechas } from '@hce/ui';
import { errorMessage } from '../errors/ApiErrorNotice';

const PAGE_SIZE = 20;

export function DocumentoHistorial({ resource }: { resource: 'compras' | 'ventas' }) {
  const [rango, setRango] = useState<RangoFechas>({});
  const [selected, setSelected] = useState<number | null>(null);
  const endpoint = api[resource];
  const documento = resource === 'compras' ? 'compra' : 'venta';

  const list = usePaginatedQuery({
    queryKey: (page) =>
      queryKeys[resource].list({
        ...rango,
        page,
        pageSize: PAGE_SIZE,
      } satisfies DocumentoQuery),
    queryFn: (page) => endpoint.listar({ ...rango, page, pageSize: PAGE_SIZE }),
  });
  const detail = useQuery({
    queryKey: queryKeys[resource].detail(selected ?? 0),
    queryFn: () => endpoint.obtener(selected!),
    enabled: selected !== null,
  });

  return (
    <DocumentoHistorialView
      documento={documento}
      rows={list.data?.items}
      loading={list.isFetching}
      error={list.error ? errorMessage(list.error) : undefined}
      page={list.page}
      pageSize={PAGE_SIZE}
      total={list.data?.total ?? 0}
      onPageChange={list.setPage}
      filtrosActivos={Boolean(rango.desde || rango.hasta)}
      onFiltrar={(r) => {
        setRango(r);
        list.resetPage();
      }}
      onVerDetalle={setSelected}
      detalle={
        <Modal
          open={selected !== null}
          onClose={() => setSelected(null)}
          size="lg"
          title={`${documento === 'compra' ? 'Compra' : 'Venta'} N.º ${selected ?? ''}`}
        >
          <DocumentoDetalle
            data={detail.data}
            loading={detail.isPending}
            error={detail.error ? errorMessage(detail.error) : undefined}
          />
        </Modal>
      }
    />
  );
}
