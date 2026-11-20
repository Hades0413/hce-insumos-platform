'use client';

import { api, type ApiError, type VentaDetalleDto } from '@hce/api-client';
import { useIdempotentMutation, useInvalidateInventory } from '@hce/api-client/react';
import type { VentaFormValues } from './schema';

export function useRegistrarVenta(options: {
  onSuccess: (venta: VentaDetalleDto) => void;
  onError: (e: ApiError) => void;
}) {
  const invalidate = useInvalidateInventory('ventas');
  return useIdempotentMutation<VentaDetalleDto, VentaFormValues>({
    mutationFn: (values, key) =>
      api.ventas.registrar(
        {
          items: values.items.map(({ productoId, cantidad }) => ({
            productoId,
            cantidad,
          })),
        },
        key,
      ),
    onSuccess: async (venta) => {
      options.onSuccess(venta);
      await invalidate();
    },
    onError: options.onError,
  });
}
