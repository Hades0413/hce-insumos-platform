'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api, type ProductoDto } from '@hce/api-client';
import { queryKeys, usePaginatedQuery, usePermiso } from '@hce/api-client/react';
import { errorMessage } from '@hce/features';
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  DateTime,
  Input,
  Kbd,
  LoteStamp,
  Money,
  Pagination,
  StockLevel,
  useDebouncedValue,
  useSearchHotkey,
  useToast,
} from '@hce/ui';
import { ProductoEditorModal } from './ProductoEditorModal';

const PAGE_SIZE = 20;

export function ProductosView() {
  const qc = useQueryClient();
  const toast = useToast();
  const puedeRegistrar = usePermiso('productos.registrar');
  const puedeEditar = usePermiso('productos.editar');
  const puedeEliminar = usePermiso('productos.eliminar');

  const [term, setTerm] = useState('');
  const [editor, setEditor] = useState<ProductoDto | 'nuevo' | null>(null);
  const [aEliminar, setAEliminar] = useState<ProductoDto | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useDebouncedValue(term.trim(), 250);
  useSearchHotkey(() => searchRef.current?.focus());

  const list = usePaginatedQuery({
    queryKey: (page) => queryKeys.productos.list({ search, page, pageSize: PAGE_SIZE }),
    queryFn: (page) => api.productos.listar({ search, page, pageSize: PAGE_SIZE }),
  });

  const invalidar = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.productos.all }),
      qc.invalidateQueries({ queryKey: queryKeys.kardex.all }),
    ]);

  const eliminar = useMutation({
    mutationFn: (p: ProductoDto) => api.productos.eliminar(p.id),
    onSuccess: async (_, p) => {
      await invalidar();
      toast.success('Producto eliminado', `${p.nombre}, lote ${p.nroLote}.`);
      setAEliminar(null);
    },
    onError: (e, p) => {
      toast.error(`No se eliminó ${p.nombre}`, errorMessage(e));
      setAEliminar(null);
    },
  });

  const conAcciones = puedeEditar || puedeEliminar;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex w-full max-w-xl items-end gap-3">
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
          <p className="mb-3 hidden items-center gap-1.5 whitespace-nowrap text-sm text-muted md:flex">
            <Kbd>/</Kbd> para buscar
          </p>
        </div>
        {puedeRegistrar && <Button onClick={() => setEditor('nuevo')}>Nuevo producto</Button>}
      </div>

      {list.error && <Alert title="No se pudo cargar el catálogo">{errorMessage(list.error)}</Alert>}
      {!(list.error && !list.data) && (
        <DataTable
          caption="Catálogo de productos"
          rows={list.data?.items}
          loading={list.isFetching}
          rowKey={(r) => r.id}
          empty={search ? 'Ningún producto coincide con la búsqueda.' : 'Aún no hay productos registrados.'}
          columns={[
            { key: 'id', header: 'Id', cell: (r) => <span className="tabular-nums text-muted">{r.id}</span> },
            {
              key: 'nombre',
              header: 'Producto',
              cell: (r) => (
                <span className="flex flex-col items-start gap-1">
                  <span className="font-semibold">{r.nombre}</span>
                  <LoteStamp lote={r.nroLote} />
                </span>
              ),
            },
            {
              key: 'fecha',
              header: 'Registrado',
              hideBelow: 'lg',
              cell: (r) => (
                <span className="text-muted">
                  <DateTime value={r.fecRegistro} />
                </span>
              ),
            },
            { key: 'stock', header: 'Stock', align: 'right', cell: (r) => <StockLevel stock={r.stock} /> },
            { key: 'costo', header: 'Costo', align: 'right', cell: (r) => <Money value={r.costo} /> },
            {
              key: 'pv',
              header: 'Precio de venta',
              align: 'right',
              cell: (r) => <Money value={r.precioVenta} />,
            },
            ...(conAcciones
              ? [
                  {
                    key: 'acc',
                    header: <span className="sr-only">Acciones</span>,
                    align: 'right' as const,
                    cell: (r: ProductoDto) => (
                      <span className="inline-flex gap-2">
                        {puedeEditar && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditor(r)}
                            aria-label={`Editar ${r.nombre}`}
                          >
                            Editar
                          </Button>
                        )}
                        {puedeEliminar && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-danger-bg"
                            onClick={() => setAEliminar(r)}
                            aria-label={`Eliminar ${r.nombre}`}
                          >
                            Eliminar
                          </Button>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
      {list.data && list.data.total > 0 && (
        <Pagination page={list.page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={list.setPage} />
      )}

      <ProductoEditorModal
        target={editor}
        onClose={() => setEditor(null)}
        onSaved={(p, accion) => {
          void invalidar();
          toast.success(accion === 'creado' ? 'Producto registrado' : 'Producto actualizado', `${p.nombre}, lote ${p.nroLote}.`);
        }}
      />

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar producto"
        confirmLabel="Eliminar producto"
        loading={eliminar.isPending}
        onCancel={() => setAEliminar(null)}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar)}
      >
        {aEliminar && (
          <p>
            <strong>{aEliminar.nombre}</strong> (lote {aEliminar.nroLote}) dejará de aparecer en el catálogo, el kardex y
            los documentos nuevos. Sus compras, ventas y movimientos se conservan. Solo es posible si no le queda stock.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
