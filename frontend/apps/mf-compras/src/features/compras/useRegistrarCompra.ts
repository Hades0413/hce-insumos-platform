'use client';

import { api, type ApiError, type CompraDetalleDto } from '@hce/api-client';
import { useIdempotentMutation, useInvalidateInventory } from '@hce/api-client/react';
import type { CompraFormValues } from './schema';

export function useRegistrarCompra(options: {
  onSuccess: (compra: CompraDetalleDto) => void;
  onError?: (e: ApiError) => void;
}) {
  const invalidate = useInvalidateInventory('compras');
  return useIdempotentMutation<CompraDetalleDto, CompraFormValues>({
    mutationFn: (values, key) =>
      api.compras.registrar(
        {
          items: values.items.map(({ productoId, cantidad, costoUnitario }) => ({
            productoId,
            cantidad,
            costoUnitario,
          })),
        },
        key,
      ),
    onSuccess: async (compra) => {
      options.onSuccess(compra);
      await invalidate();
    },
    onError: options.onError,
  });
}
