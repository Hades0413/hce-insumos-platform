'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { api, type ProductoDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { formatPEN, precioVentaDesdeCosto } from '@hce/domain';
import { ApiErrorNotice } from '@hce/features';
import { Button, Input, Modal, useToast } from '@hce/ui';
import { productoFormSchema, type ProductoFormValues } from './schema';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (producto: ProductoDto) => void;
}

export function ProductoFormModal({ open, onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const form = useForm<ProductoFormValues>({
    resolver: zodResolver(productoFormSchema),
    defaultValues: { nombre: '', nroLote: '', costo: 0 },
  });
  const costo = useWatch({ control: form.control, name: 'costo' });

  const mutation = useMutation({
    mutationFn: (values: ProductoFormValues) => api.productos.crear(values),
    onSuccess: async (producto) => {
      await qc.invalidateQueries({ queryKey: queryKeys.productos.all });
      toast.success('Producto registrado', `${producto.nombre}, lote ${producto.nroLote}, agregado a la compra.`);
      form.reset();
      onClose();
      onCreated(producto);
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    mutation.reset();
    form.reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!mutation.isPending}
      title="Registrar producto"
      description="Queda disponible para compras y ventas, y se agrega a esta compra."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="producto-form" loading={mutation.isPending}>
            Registrar producto
          </Button>
        </>
      }
    >
      <form
        id="producto-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.stopPropagation();
          void form.handleSubmit((v) => mutation.mutate(v))(e);
        }}
      >
        <ApiErrorNotice error={mutation.error} title="El producto no se registró" />
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
            hint={`Precio de venta: ${formatPEN(precioVentaDesdeCosto(Number(costo) || 0))}`}
            {...form.register('costo', { valueAsNumber: true })}
          />
        </div>
      </form>
    </Modal>
  );
}
