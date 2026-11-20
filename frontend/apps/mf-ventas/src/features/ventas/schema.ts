import { z } from 'zod';

z.config({ jitless: true });

export const MENSAJE_STOCK = 'La cantidad no debe ser mayor al stock';

export const ventaItemSchema = z.object({
  productoId: z.number().int().positive(),
  nombre: z.string(),
  nroLote: z.string(),
  precioVenta: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  cantidad: z
    .number({ error: 'Ingrese la cantidad' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1')
    .max(100_000, 'Máximo 100 000'),
});

export const ventaFormSchema = z.object({
  items: z
    .array(ventaItemSchema)
    .min(1, 'Agregue al menos un producto')
    .max(100, 'Máximo 100 productos por venta')
    .refine((items) => new Set(items.map((i) => i.productoId)).size === items.length, 'Hay productos repetidos'),
});

export type VentaFormValues = z.infer<typeof ventaFormSchema>;

export const lineasSinStock = (items: VentaFormValues['items']): number[] =>
  items.flatMap((i, idx) => (i.cantidad > i.stock ? [idx] : []));
