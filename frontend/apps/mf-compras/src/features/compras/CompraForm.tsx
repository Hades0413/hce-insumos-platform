'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { CompraDetalleDto, ProductoDto } from '@hce/api-client';
import { Can, usePermiso } from '@hce/api-client/react';
import { formatPEN, IGV_RATE } from '@hce/domain';
import { ApiErrorNotice, errorMessage, ProductoPicker, useLineTotals, useSuccessFlash } from '@hce/features';
import {
  Alert,
  Button,
  Card,
  DocumentFooter,
  EmptyState,
  Kbd,
  LineItemsTable,
  useModifierKeyLabel,
  useToast,
  WIDE_ONLY,
} from '@hce/ui';
import { CompraLineRow } from './CompraLineRow';
import { ProductoFormModal } from './ProductoFormModal';
import { compraFormSchema, type CompraFormValues } from './schema';
import { useRegistrarCompra } from './useRegistrarCompra';

const COLUMNS = [
  { key: 'producto', header: 'Producto' },
  { key: 'cantidad', header: 'Cantidad', align: 'right' as const },
  { key: 'costo', header: 'Costo unitario', align: 'right' as const },
  { key: 'pv', header: 'Precio de venta nuevo', align: 'right' as const },
  { key: 'sub', header: 'Subtotal', align: 'right' as const, className: WIDE_ONLY },
  {
    key: 'igv',
    header: `IGV ${Math.round(IGV_RATE * 100)} %`,
    align: 'right' as const,
    className: WIDE_ONLY,
  },
  { key: 'total', header: 'Total', align: 'right' as const },
  { key: 'quitar', header: <span className="sr-only">Quitar</span> },
];

export function CompraForm() {
  const toast = useToast();
  const mod = useModifierKeyLabel();
  const [modalOpen, setModalOpen] = useState(false);
  const puedeRegistrarProducto = usePermiso('productos.registrar');
  const [ultima, setUltima] = useState<CompraDetalleDto | null>(null);
  const [success, flashSuccess] = useSuccessFlash();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [nuevaLinea, setNuevaLinea] = useState<number | null>(null);

  const form = useForm<CompraFormValues>({
    resolver: zodResolver(compraFormSchema),
    defaultValues: { items: [] },
    mode: 'onTouched',
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
    keyName: 'key',
  });
  const items = useWatch({ control: form.control, name: 'items' });
  const { lineas, totales } = useLineTotals(
    items,
    (i) => i?.cantidad,
    (i) => i?.costoUnitario,
  );

  const registrar = useRegistrarCompra({
    onSuccess: (compra) => {
      setUltima(compra);
      flashSuccess();
      form.reset({ items: [] });
      toast.success(
        `Compra N.º ${compra.id} registrada`,
        `Total ${formatPEN(compra.total)}. Stock y precios actualizados.`,
      );
    },
    onError: (e) => toast.error('La compra no se registró', errorMessage(e)),
  });

  const agregar = (p: ProductoDto) => {
    setUltima(null);
    append({
      productoId: p.id,
      nombre: p.nombre,
      nroLote: p.nroLote,
      cantidad: 1,
      costoUnitario: p.costo > 0 ? p.costo : Number.NaN,
    });
    setNuevaLinea(p.id);
  };

  const onEnter = (index: number) => (field: 'cantidad' | 'costoUnitario', e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (field === 'cantidad')
      return form.setFocus(`items.${index}.costoUnitario`, {
        shouldSelect: true,
      });
    if (index < fields.length - 1)
      return form.setFocus(`items.${index + 1}.cantidad`, {
        shouldSelect: true,
      });
    submitRef.current?.focus();
  };

  const listError = form.formState.errors.items?.message ?? form.formState.errors.items?.root?.message;

  return (
    <>
      <form noValidate onSubmit={form.handleSubmit((v) => registrar.mutate(v))} className="flex flex-col gap-5">
        <Card
          title="Productos de la compra"
          actions={
            <Can permiso="productos.registrar">
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                Registrar producto nuevo
              </Button>
            </Can>
          }
        >
          <div className="flex flex-col gap-4">
            <ProductoPicker
              mode="compra"
              label="Agregar producto"
              hotkey
              excludeIds={fields.map((f) => f.productoId)}
              onSelect={agregar}
            />
            <p className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
              Busca con <Kbd>{mod}</Kbd>
              <Kbd>K</Kbd>, elige con <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> y <Kbd>Enter</Kbd>. Con <Kbd>Enter</Kbd> pasas de un campo al siguiente.
            </p>

            {fields.length === 0 ? (
              <EmptyState
                title="Agrega el primer producto"
                description={
                  puedeRegistrarProducto
                    ? 'Busca por nombre o lote. Si el producto aún no existe, usa «Registrar producto nuevo».'
                    : 'Busca por nombre o lote. Para dar de alta un producto nuevo, pide el permiso a un administrador.'
                }
              />
            ) : (
              <LineItemsTable caption="Productos de la compra" columns={COLUMNS}>
                {fields.map((field, idx) => (
                  <CompraLineRow
                    key={field.key}
                    autoFocus={field.productoId === nuevaLinea}
                    index={idx}
                    nombre={field.nombre}
                    nroLote={field.nroLote}
                    costo={Number(items?.[idx]?.costoUnitario)}
                    linea={lineas[idx] ?? { subTotal: 0, igv: 0, total: 0 }}
                    register={form.register}
                    errors={form.formState.errors.items}
                    onRemove={() => remove(idx)}
                    onEnter={onEnter(idx)}
                  />
                ))}
              </LineItemsTable>
            )}
            {listError && <Alert title={listError} />}
          </div>
        </Card>

        <ApiErrorNotice error={registrar.error} title="La compra no se registró" />
        {ultima && (
          <Alert tone="ok" title={`Compra N.º ${ultima.id} registrada`}>
            {ultima.cantidadItems} {ultima.cantidadItems === 1 ? 'producto' : 'productos'} por {formatPEN(ultima.total)}
            . El kardex ya muestra la entrada.
          </Alert>
        )}

        <DocumentFooter
          submitRef={submitRef}
          submitLabel="Registrar compra"
          loading={registrar.isPending}
          success={success}
          disabled={fields.length === 0}
          totales={totales}
          note="Al registrar, el costo de cada producto se actualiza y su precio de venta pasa a ser costo × 1.35."
        />
      </form>

      <ProductoFormModal
        open={modalOpen && puedeRegistrarProducto}
        onClose={() => setModalOpen(false)}
        onCreated={agregar}
      />
    </>
  );
}
