'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api, type ProductoDto } from '@hce/api-client';
import { usePermiso } from '@hce/api-client/react';
import { formatPEN, precioVentaDesdeCosto } from '@hce/domain';
import { ApiErrorNotice } from '@hce/features';
import { Button, Input, Modal } from '@hce/ui';
import { productoEditorSchema, type ProductoEditorValues } from './schema';

interface Props {
  target: ProductoDto | 'nuevo' | null;
  onClose: () => void;
  onSaved: (producto: ProductoDto, accion: 'creado' | 'actualizado') => void;
}

const EMPTY: ProductoEditorValues = { nombre: '', nroLote: '', costo: 0, precioManual: false, precioVenta: undefined };

function valoresDe(p: ProductoDto): ProductoEditorValues {
  const sugerido = precioVentaDesdeCosto(p.costo);
  return {
    nombre: p.nombre,
    nroLote: p.nroLote,
    costo: p.costo,
    precioManual: Math.abs(p.precioVenta - sugerido) >= 0.005,
    precioVenta: p.precioVenta,
  };
}

export function ProductoEditorModal({ target, onClose, onSaved }: Props) {
  const editando = target !== null && target !== 'nuevo' ? target : null;
  const puedePrecioManual = usePermiso('productos.precio_manual');
  const form = useForm<ProductoEditorValues>({ resolver: zodResolver(productoEditorSchema), defaultValues: EMPTY });
  const [costo, precioManual] = useWatch({ control: form.control, name: ['costo', 'precioManual'] });

  useEffect(() => {
    if (target !== null) form.reset(editando ? valoresDe(editando) : EMPTY);
  }, [target, editando, form]);

  const mutation = useMutation({
    mutationFn: (v: ProductoEditorValues) => {
      const precioVenta = puedePrecioManual && v.precioManual ? v.precioVenta : undefined;
      return editando
        ? api.productos.actualizar(editando.id, {
            nombre: v.nombre,
            nroLote: v.nroLote,
            costo: v.costo,
            precioVenta,
            rowVersion: editando.rowVersion,
          })
        : api.productos.crear({ nombre: v.nombre, nroLote: v.nroLote, costo: v.costo });
    },
    onSuccess: (producto) => {
      onSaved(producto, editando ? 'actualizado' : 'creado');
      mutation.reset();
      onClose();
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    mutation.reset();
    onClose();
  };

  const sugerido = formatPEN(precioVentaDesdeCosto(Number(costo) || 0));

  return (
    <Modal
      open={target !== null}
      onClose={close}
      dismissible={!mutation.isPending}
      title={editando ? 'Editar producto' : 'Nuevo producto'}
      description={
        editando
          ? 'Si el producto ya tiene movimientos en el kardex, su nombre y lote no se pueden cambiar.'
          : 'Queda disponible para compras y ventas. El stock empieza en 0 hasta registrar una compra.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="producto-editor" loading={mutation.isPending}>
            {editando ? 'Guardar cambios' : 'Registrar producto'}
          </Button>
        </>
      }
    >
      <form
        id="producto-editor"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <ApiErrorNotice
          error={mutation.error}
          title={editando ? 'Los cambios no se guardaron' : 'El producto no se registró'}
        />
        <Input
          label="Nombre del producto"
          autoComplete="off"
          maxLength={150}
          data-autofocus
          error={form.formState.errors.nombre?.message}
          {...form.register('nombre')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="N.º de lote"
            autoComplete="off"
            maxLength={50}
            className="font-code uppercase"
            error={form.formState.errors.nroLote?.message}
            {...form.register('nroLote')}
          />
          <Input
            label="Costo unitario (S/)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            className="text-right tabular-nums"
            error={form.formState.errors.costo?.message}
            hint={precioManual && puedePrecioManual ? undefined : `Precio de venta: ${sugerido} (costo × 1.35)`}
            {...form.register('costo', { valueAsNumber: true })}
          />
        </div>
        {editando && puedePrecioManual && (
          <fieldset className="flex flex-col gap-3 rounded-md border border-line p-4">
            <legend className="px-1 text-sm font-semibold text-ink">Precio de venta</legend>
            <label className="flex items-center gap-2 text-[0.9375rem] text-ink">
              <input type="checkbox" className="h-5 w-5 accent-brand-600" {...form.register('precioManual')} />
              Fijar un precio manual (en lugar de {sugerido})
            </label>
            {precioManual && (
              <Input
                label="Precio de venta (S/)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                className="text-right tabular-nums"
                containerClassName="sm:max-w-[50%]"
                error={form.formState.errors.precioVenta?.message}
                hint="Nunca puede quedar por debajo del costo."
                {...form.register('precioVenta', { valueAsNumber: true })}
              />
            )}
          </fieldset>
        )}
      </form>
    </Modal>
  );
}
