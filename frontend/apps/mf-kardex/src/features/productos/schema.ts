import { z } from 'zod';

z.config({ jitless: true });

const hasMax2Decimals = (n: number): boolean => Math.abs(Math.round(n * 100) - n * 100) < 1e-6;

const money = (label: string) =>
  z
    .number({ error: `Ingrese ${label} válido` })
    .min(0, 'No puede ser negativo')
    .max(1_000_000, 'Monto demasiado alto')
    .refine(hasMax2Decimals, 'Máximo 2 decimales');

export const productoEditorSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150, 'Máximo 150 caracteres'),
    nroLote: z
      .string()
      .trim()
      .min(1, 'Ingrese el número de lote')
      .max(50, 'Máximo 50 caracteres')
      .regex(/^[A-Za-z0-9][A-Za-z0-9\-_/.]*$/, 'Solo letras, números y - _ / .'),
    costo: money('un costo'),
    precioManual: z.boolean(),
    precioVenta: money('un precio').optional(),
  })
  .refine((v) => !v.precioManual || (v.precioVenta !== undefined && !Number.isNaN(v.precioVenta)), {
    path: ['precioVenta'],
    message: 'Ingrese el precio de venta',
  })
  .refine((v) => !v.precioManual || v.precioVenta === undefined || v.precioVenta >= v.costo, {
    path: ['precioVenta'],
    message: 'No puede ser menor que el costo',
  });

export type ProductoEditorValues = z.infer<typeof productoEditorSchema>;
