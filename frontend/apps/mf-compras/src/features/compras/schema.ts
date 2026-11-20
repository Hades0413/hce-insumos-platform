import { z } from 'zod';

z.config({ jitless: true });

const hasMax2Decimals = (n: number): boolean => Math.abs(Math.round(n * 100) - n * 100) < 1e-6;

export const compraItemSchema = z.object({
  productoId: z.number().int().positive(),
  nombre: z.string(),
  nroLote: z.string(),
  cantidad: z
    .number({ error: 'Ingrese la cantidad' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1')
    .max(100_000, 'Máximo 100 000'),
  costoUnitario: z
    .number({ error: 'Ingrese el costo' })
    .positive('Debe ser mayor a 0')
    .max(1_000_000, 'Costo demasiado alto')
    .refine(hasMax2Decimals, 'Máximo 2 decimales'),
});

export const compraFormSchema = z.object({
  items: z
    .array(compraItemSchema)
    .min(1, 'Agregue al menos un producto')
    .max(100, 'Máximo 100 productos por compra')
    .refine((items) => new Set(items.map((i) => i.productoId)).size === items.length, 'Hay productos repetidos'),
});

export type CompraFormValues = z.infer<typeof compraFormSchema>;

export const productoFormSchema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150, 'Máximo 150 caracteres'),
  nroLote: z
    .string()
    .trim()
    .min(1, 'Ingrese el número de lote')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[A-Za-z0-9\-_/.]+$/, 'Solo letras, números y - _ / .'),
  costo: z
    .number({ error: 'Ingrese un costo válido' })
    .min(0, 'No puede ser negativo')
    .max(1_000_000, 'Costo demasiado alto')
    .refine(hasMax2Decimals, 'Máximo 2 decimales'),
});

export type ProductoFormValues = z.infer<typeof productoFormSchema>;
