'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { lineIndexOf, type ApiError, type ProductoDto, type VentaDetalleDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { formatPEN, IGV_RATE } from '@hce/domain';
import { ApiErrorNotice, errorMessage, ProductoPicker, useLineTotals, useSuccessFlash } from '@hce/features';
import { Alert, Card, DocumentFooter, EmptyState, Kbd, LineItemsTable, useModifierKeyLabel, useToast, WIDE_ONLY } from '@hce/ui';
import { lineasSinStock, MENSAJE_STOCK, ventaFormSchema, type VentaFormValues } from './schema';
import { useRegistrarVenta } from './useRegistrarVenta';
import { VentaLineRow } from './VentaLineRow';

const COLUMNS = [
  { key: 'producto', header: 'Producto' },
  { key: 'precio', header: 'Precio de venta', align: 'right' as const },
  { key: 'stock', header: 'Stock', align: 'right' as const },
  { key: 'cantidad', header: 'Cantidad', align: 'right' as const },
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

const stockMessage = (disponible: number) => `${MENSAJE_STOCK} (disponible: ${disponible.toLocaleString('es-PE')})`;

export function VentaForm() {
  const qc = useQueryClient();
  const toast = useToast();
  const mod = useModifierKeyLabel();
  const [stockError, setStockError] = useState(false);
  const [ultima, setUltima] = useState<VentaDetalleDto | null>(null);
  const [success, flashSuccess] = useSuccessFlash();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [nuevaLinea, setNuevaLinea] = useState<number | null>(null);

  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: { items: [] },
    mode: 'onTouched',
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
    keyName: 'key',
  });
  const items = useWatch({ control: form.control, name: 'items' });
  const { lineas, totales } = useLineTotals(
    items,
    (i) => i?.cantidad,
    (i) => i?.precioVenta,
  );

  const marcarConflictosDeStock = (err: ApiError) => {
    const current = form.getValues('items');
    for (const fe of err.errors) {
      const idx =
        typeof fe.productoId === 'number'
          ? current.findIndex((i) => i.productoId === fe.productoId)
          : (lineIndexOf(fe) ?? -1);
      const linea = current[idx];
      if (!linea) continue;
      const disponible = typeof fe.stockDisponible === 'number' ? fe.stockDisponible : linea.stock;
      update(idx, { ...linea, stock: disponible });
      form.setError(`items.${idx}.cantidad`, {
        type: 'stock',
        message: stockMessage(disponible),
      });
    }
    void qc.invalidateQueries({ queryKey: queryKeys.productos.all });
  };

  const registrar = useRegistrarVenta({
    onSuccess: (venta) => {
      setUltima(venta);
      setStockError(false);
      flashSuccess();
      form.reset({ items: [] });
      toast.success(`Venta N.º ${venta.id} registrada`, `Total ${formatPEN(venta.total)}. El stock ya se descontó.`);
    },
    onError: (err) => {
      if (err.code === 'STOCK_INSUFICIENTE') {
        setStockError(true);
        marcarConflictosDeStock(err);
        return;
      }
      toast.error('La venta no se registró', errorMessage(err));
    },
  });

  const onValid = (values: VentaFormValues) => {
    const sinStock = lineasSinStock(values.items);
    if (sinStock.length > 0) {
      setStockError(true);
      sinStock.forEach((idx) =>
        form.setError(`items.${idx}.cantidad`, {
          type: 'stock',
          message: stockMessage(values.items[idx]!.stock),
        }),
      );
      form.setFocus(`items.${sinStock[0]!}.cantidad`, { shouldSelect: true });
      return;
    }
    setStockError(false);
    registrar.mutate(values);
  };

  const agregar = (p: ProductoDto) => {
    setUltima(null);
    append({
      productoId: p.id,
      nombre: p.nombre,
      nroLote: p.nroLote,
      precioVenta: p.precioVenta,
      stock: p.stock,
      cantidad: 1,
    });
    setNuevaLinea(p.id);
  };

  const onEnter = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (index < fields.length - 1) form.setFocus(`items.${index + 1}.cantidad`, { shouldSelect: true });
    else submitRef.current?.focus();
  };

  const listError = form.formState.errors.items?.message ?? form.formState.errors.items?.root?.message;

  return (
    <form noValidate onSubmit={form.handleSubmit(onValid)} className="flex flex-col gap-5">
      <Card title="Productos de la venta">
        <div className="flex flex-col gap-4">
          <ProductoPicker
            mode="venta"
            label="Agregar producto"
            hotkey
            excludeIds={fields.map((f) => f.productoId)}
            onSelect={agregar}
          />
          <p className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
            Busca con <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>, elige con <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> y <Kbd>Enter</Kbd>. <Kbd>Enter</Kbd> en la última cantidad te lleva a «Registrar venta».
          </p>

          {fields.length === 0 ? (
            <EmptyState
              title="Agrega el primer producto"
              description="Verás su precio de venta y cuánto stock queda antes de dispensar."
            />
          ) : (
            <LineItemsTable caption="Productos de la venta" columns={COLUMNS}>
              {fields.map((field, idx) => (
                <VentaLineRow
                  key={field.key}
                  autoFocus={field.productoId === nuevaLinea}
                  index={idx}
                  nombre={field.nombre}
                  nroLote={field.nroLote}
                  precioVenta={field.precioVenta}
                  stock={field.stock}
                  cantidad={Number(items?.[idx]?.cantidad)}
                  linea={lineas[idx] ?? { subTotal: 0, igv: 0, total: 0 }}
                  error={form.formState.errors.items?.[idx]?.cantidad}
                  register={form.register}
                  onRemove={() => remove(idx)}
                  onEnter={onEnter(idx)}
                />
              ))}
            </LineItemsTable>
          )}
          {listError && <Alert title={listError} />}
        </div>
      </Card>

      {stockError && (
        <Alert title={MENSAJE_STOCK}>
          Corrige las cantidades marcadas en rojo; no pueden superar el stock disponible.
        </Alert>
      )}
      {!stockError && <ApiErrorNotice error={registrar.error} title="La venta no se registró" />}
      {ultima && (
        <Alert tone="ok" title={`Venta N.º ${ultima.id} registrada`}>
          {ultima.cantidadItems} {ultima.cantidadItems === 1 ? 'producto' : 'productos'} por {formatPEN(ultima.total)}.
          El kardex ya muestra la salida.
        </Alert>
      )}

      <DocumentFooter
        submitRef={submitRef}
        submitLabel="Registrar venta"
        loading={registrar.isPending}
        success={success}
        disabled={fields.length === 0}
        totales={totales}
      />
    </form>
  );
}
