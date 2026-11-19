'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { api, ApiError, type CompraDetalleDto, type ProductoDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { calcularLinea, calcularTotales, formatPEN, precioVentaDesdeCosto, uuidv4 } from '@hce/domain';
import { Alert, Button, Card, EmptyState, Money, ProductoPicker, Totales, useToast } from '@hce/ui';
import { compraFormSchema, type CompraFormValues } from './schema';
import { ProductoFormModal } from './ProductoFormModal';

/**
 * Registro de compra (PDF 1.2.1): varias líneas, alta de producto en modal,
 * totales en vivo. El backend registra CompraCab/CompraDet, actualiza costo y
 * precio de venta (costo × 1.35) y genera el movimiento de ENTRADA en una sola transacción.
 */
export function CompraForm() {
  const qc = useQueryClient();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [ultima, setUltima] = useState<CompraDetalleDto | null>(null);
  // Idempotency-Key estable por intento: si la red falla y el usuario reintenta,
  // el backend no duplica la compra. Se renueva solo tras un registro exitoso.
  const idempotencyKey = useRef<string>(uuidv4());

  const form = useForm<CompraFormValues>({
    resolver: zodResolver(compraFormSchema),
    defaultValues: { items: [] },
    mode: 'onTouched',
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items', keyName: 'key' });
  const items = useWatch({ control: form.control, name: 'items' });

  const lineas = useMemo(
    () => (items ?? []).map((i) => calcularLinea(Number(i?.cantidad), Number(i?.costoUnitario))),
    [items],
  );
  const totales = useMemo(() => calcularTotales(lineas), [lineas]);

  const mutation = useMutation({
    mutationFn: (values: CompraFormValues) =>
      api.compras.registrar(
        { items: values.items.map(({ productoId, cantidad, costoUnitario }) => ({ productoId, cantidad, costoUnitario })) },
        idempotencyKey.current,
      ),
    onSuccess: async (compra) => {
      idempotencyKey.current = uuidv4();
      setUltima(compra);
      form.reset({ items: [] });
      toast.success(`Compra N.º ${compra.id} registrada`, `Total ${formatPEN(compra.total)}`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.compras.all }),
        qc.invalidateQueries({ queryKey: queryKeys.productos.all }),
        qc.invalidateQueries({ queryKey: queryKeys.kardex.all }),
      ]);
    },
    onError: (e) => toast.error('No se registró la compra', ApiError.from(e).message),
  });

  const agregar = (p: ProductoDto) => {
    setUltima(null);
    append({ productoId: p.id, nombre: p.nombre, nroLote: p.nroLote, cantidad: 1, costoUnitario: p.costo > 0 ? p.costo : Number.NaN });
  };

  const apiError = mutation.error ? ApiError.from(mutation.error) : null;
  const itemsError = form.formState.errors.items;
  const listError = itemsError?.message ?? itemsError?.root?.message;

  return (
    <>
      <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-5">
        <Card
          title="Productos de la compra"
          actions={
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              + Registrar producto
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <ProductoPicker mode="compra" onSelect={agregar} excludeIds={fields.map((f) => f.productoId)} label="Agregar producto existente" />
            <p className="text-xs text-muted">
              ¿No existe el producto? Usa <strong>Registrar producto</strong>. Al guardar, el costo del producto se actualiza y su precio de venta pasa a ser <strong>costo × 1.35</strong>.
            </p>

            {fields.length === 0 ? (
              <EmptyState title="Aún no hay productos" description="Busca un producto o registra uno nuevo para comenzar." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[720px] text-sm">
                  <caption className="sr-only">Líneas de la compra</caption>
                  <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left">Producto</th>
                      <th scope="col" className="w-28 px-3 py-2 text-right">Cantidad</th>
                      <th scope="col" className="w-36 px-3 py-2 text-right">Costo unit.</th>
                      <th scope="col" className="px-3 py-2 text-right">Subtotal</th>
                      <th scope="col" className="px-3 py-2 text-right">IGV</th>
                      <th scope="col" className="px-3 py-2 text-right">Total</th>
                      <th scope="col" className="w-12 px-3 py-2"><span className="sr-only">Quitar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, idx) => {
                      const errs = form.formState.errors.items?.[idx];
                      const linea = lineas[idx] ?? { subTotal: 0, igv: 0, total: 0 };
                      const costo = Number(items?.[idx]?.costoUnitario);
                      return (
                        <tr key={field.key} className="border-t border-line align-top">
                          <td className="px-3 py-2">
                            <p className="font-medium text-ink">{field.nombre}</p>
                            <p className="text-xs text-muted">
                              Lote {field.nroLote} · P. venta nuevo: {Number.isFinite(costo) ? formatPEN(precioVentaDesdeCosto(costo)) : '—'}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              step={1}
                              aria-label={`Cantidad de ${field.nombre}`}
                              aria-invalid={errs?.cantidad ? true : undefined}
                              className="h-10 w-full rounded-lg border border-line px-2 text-right aria-[invalid=true]:border-danger"
                              {...form.register(`items.${idx}.cantidad`, { valueAsNumber: true })}
                            />
                            {errs?.cantidad && <p role="alert" className="mt-1 text-xs text-danger">{errs.cantidad.message}</p>}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0.01}
                              step="0.01"
                              aria-label={`Costo unitario de ${field.nombre}`}
                              aria-invalid={errs?.costoUnitario ? true : undefined}
                              className="h-10 w-full rounded-lg border border-line px-2 text-right aria-[invalid=true]:border-danger"
                              {...form.register(`items.${idx}.costoUnitario`, { valueAsNumber: true })}
                            />
                            {errs?.costoUnitario && <p role="alert" className="mt-1 text-xs text-danger">{errs.costoUnitario.message}</p>}
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

        {apiError && (
          <Alert title="No se pudo registrar la compra">
            <p>{apiError.message}</p>
            {apiError.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {apiError.errors.map((e, i) => (
                  <li key={i}>{e.field ? `${e.field}: ` : ''}{e.message}</li>
                ))}
              </ul>
            )}
            {apiError.requestId && <p className="mt-1 text-xs opacity-70">Ref: {apiError.requestId}</p>}
          </Alert>
        )}
        {ultima && (
          <Alert tone="ok" title={`Compra N.º ${ultima.id} registrada correctamente`}>
            {ultima.cantidadItems} ítem(s) · Total {formatPEN(ultima.total)}. Se generó el movimiento de ENTRADA en el kardex.
          </Alert>
        )}

        <div className="flex flex-col-reverse gap-4 rounded-card border border-line bg-surface p-5 shadow-card md:flex-row md:items-end md:justify-between">
          <Button type="submit" size="lg" loading={mutation.isPending} disabled={fields.length === 0} className="md:w-60">
            Registrar compra
          </Button>
          <Totales {...totales} />
        </div>
      </form>

      <ProductoFormModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={agregar} />
    </>
  );
}
