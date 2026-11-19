'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { api, ApiError, type ProductoDto, type VentaDetalleDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { calcularLinea, calcularTotales, formatPEN, IGV_RATE, uuidv4 } from '@hce/domain';
import { Alert, Badge, Button, Card, EmptyState, Money, ProductoPicker, Totales, useToast } from '@hce/ui';
import { lineasSinStock, MENSAJE_STOCK, ventaFormSchema, type VentaFormValues } from './schema';

/**
 * Registro de venta (PDF 1.2.2). Cálculo por línea al digitar la cantidad:
 *   Subtotal = cantidad × precio venta · IGV = subtotal × 18% · Total = subtotal + IGV.
 * Al guardar se valida cantidad ≤ stock; el backend lo revalida bajo bloqueo
 * transaccional (sin sobreventa concurrente) y responde 422 STOCK_INSUFICIENTE.
 */
export function VentaForm() {
  const qc = useQueryClient();
  const toast = useToast();
  const [stockError, setStockError] = useState(false);
  const [ultima, setUltima] = useState<VentaDetalleDto | null>(null);
  const idempotencyKey = useRef<string>(uuidv4());

  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: { items: [] },
    mode: 'onTouched',
  });
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'items', keyName: 'key' });
  const items = useWatch({ control: form.control, name: 'items' });

  const lineas = useMemo(
    () => (items ?? []).map((i) => calcularLinea(Number(i?.cantidad), Number(i?.precioVenta))),
    [items],
  );
  const totales = useMemo(() => calcularTotales(lineas), [lineas]);

  const mutation = useMutation({
    mutationFn: (values: VentaFormValues) =>
      api.ventas.registrar({ items: values.items.map(({ productoId, cantidad }) => ({ productoId, cantidad })) }, idempotencyKey.current),
    onSuccess: async (venta) => {
      idempotencyKey.current = uuidv4();
      setUltima(venta);
      setStockError(false);
      form.reset({ items: [] });
      toast.success(`Venta N.º ${venta.id} registrada`, `Total ${formatPEN(venta.total)}`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.ventas.all }),
        qc.invalidateQueries({ queryKey: queryKeys.productos.all }),
        qc.invalidateQueries({ queryKey: queryKeys.kardex.all }),
      ]);
    },
    onError: (e) => {
      const err = ApiError.from(e);
      if (err.code === 'STOCK_INSUFICIENTE') {
        setStockError(true);
        const current = form.getValues('items');
        for (const fe of err.errors) {
          const idx = current.findIndex((i) => i.productoId === fe.productoId);
          if (idx < 0) continue;
          const disponible = typeof fe.stockDisponible === 'number' ? fe.stockDisponible : current[idx]!.stock;
          update(idx, { ...current[idx]!, stock: disponible });
          form.setError(`items.${idx}.cantidad`, { type: 'stock', message: `${MENSAJE_STOCK} (disponible: ${disponible})` });
        }
        void qc.invalidateQueries({ queryKey: queryKeys.productos.all });
        return;
      }
      toast.error('No se registró la venta', err.message);
    },
  });

  const onValid = (values: VentaFormValues) => {
    const sinStock = lineasSinStock(values.items);
    if (sinStock.length > 0) {
      setStockError(true);
      sinStock.forEach((idx) =>
        form.setError(`items.${idx}.cantidad`, { type: 'stock', message: `${MENSAJE_STOCK} (disponible: ${values.items[idx]!.stock})` }),
      );
      return;
    }
    setStockError(false);
    mutation.mutate(values);
  };

  const agregar = (p: ProductoDto) => {
    setUltima(null);
    append({ productoId: p.id, nombre: p.nombre, nroLote: p.nroLote, precioVenta: p.precioVenta, stock: p.stock, cantidad: 1 });
  };

  const apiError = mutation.error ? ApiError.from(mutation.error) : null;
  const itemsError = form.formState.errors.items;
  const listError = itemsError?.message ?? itemsError?.root?.message;

  return (
    <form noValidate onSubmit={form.handleSubmit(onValid)} className="flex flex-col gap-5">
      <Card title="Productos de la venta">
        <div className="flex flex-col gap-4">
          <ProductoPicker mode="venta" onSelect={agregar} excludeIds={fields.map((f) => f.productoId)} label="Agregar producto" />

          {fields.length === 0 ? (
            <EmptyState title="Aún no hay productos" description="Busca un producto: verás su precio de venta y el stock disponible." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[760px] text-sm">
                <caption className="sr-only">Líneas de la venta</caption>
                <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left">Producto</th>
                    <th scope="col" className="px-3 py-2 text-right">Precio venta</th>
                    <th scope="col" className="px-3 py-2 text-right">Stock</th>
                    <th scope="col" className="w-28 px-3 py-2 text-right">Cantidad</th>
                    <th scope="col" className="px-3 py-2 text-right">Subtotal</th>
                    <th scope="col" className="px-3 py-2 text-right">IGV ({Math.round(IGV_RATE * 100)}%)</th>
                    <th scope="col" className="px-3 py-2 text-right">Total</th>
                    <th scope="col" className="w-12 px-3 py-2"><span className="sr-only">Quitar</span></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const err = form.formState.errors.items?.[idx]?.cantidad;
                    const linea = lineas[idx] ?? { subTotal: 0, igv: 0, total: 0 };
                    const cantidad = Number(items?.[idx]?.cantidad);
                    const excede = Number.isFinite(cantidad) && cantidad > field.stock;
                    return (
                      <tr key={field.key} className="border-t border-line align-top">
                        <td className="px-3 py-2">
                          <p className="font-medium text-ink">{field.nombre}</p>
                          <p className="text-xs text-muted">Lote {field.nroLote} · ID {field.productoId}</p>
                        </td>
                        <td className="px-3 py-2 text-right"><Money value={field.precioVenta} /></td>
                        <td className="px-3 py-2 text-right">
                          <Badge tone={field.stock === 0 ? 'danger' : excede ? 'warn' : 'ok'}>{field.stock}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            aria-label={`Cantidad de ${field.nombre}`}
                            aria-invalid={err ? true : undefined}
                            className="h-10 w-full rounded-lg border border-line px-2 text-right aria-[invalid=true]:border-danger"
                            {...form.register(`items.${idx}.cantidad`, { valueAsNumber: true })}
                          />
                          {err && <p role="alert" className="mt-1 text-xs text-danger">{err.message}</p>}
                        </td>
                        <td className="px-3 py-2 text-right"><Money value={linea.subTotal} /></td>
                        <td className="px-3 py-2 text-right"><Money value={linea.igv} /></td>
                        <td className="px-3 py-2 text-right font-semibold"><Money value={linea.total} /></td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => remove(idx)} aria-label={`Quitar ${field.nombre}`} className="h-10 w-10 rounded-lg text-danger hover:bg-danger-bg">
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {listError && <Alert title={listError} />}
        </div>
      </Card>

      {stockError && <Alert title={MENSAJE_STOCK}>Revisa las cantidades marcadas; no pueden superar el stock disponible.</Alert>}
      {apiError && !stockError && (
        <Alert title="No se pudo registrar la venta">
          <p>{apiError.message}</p>
          {apiError.requestId && <p className="mt-1 text-xs opacity-70">Ref: {apiError.requestId}</p>}
        </Alert>
      )}
      {ultima && (
        <Alert tone="ok" title={`Venta N.º ${ultima.id} registrada correctamente`}>
          {ultima.cantidadItems} ítem(s) · Total {formatPEN(ultima.total)}. Se generó el movimiento de SALIDA en el kardex.
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-4 rounded-card border border-line bg-surface p-5 shadow-card md:flex-row md:items-end md:justify-between">
        <Button type="submit" size="lg" loading={mutation.isPending} disabled={fields.length === 0} className="md:w-60">
          Registrar venta
        </Button>
        <Totales {...totales} />
      </div>
    </form>
  );
}
