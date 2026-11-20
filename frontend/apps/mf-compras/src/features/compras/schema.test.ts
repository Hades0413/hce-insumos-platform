import { describe, expect, it } from 'vitest';
import { compraFormSchema, productoFormSchema } from './schema';

const linea = {
  productoId: 1,
  nombre: 'Paracetamol 500mg',
  nroLote: 'L-001',
  cantidad: 10,
  costoUnitario: 1.25,
};

describe('compraFormSchema', () => {
  it('acepta una compra válida', () => {
    expect(compraFormSchema.safeParse({ items: [linea] }).success).toBe(true);
  });

  it('rechaza compra vacía', () => {
    const r = compraFormSchema.safeParse({ items: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('Agregue al menos un producto');
  });

  it('rechaza cantidad decimal, costo con 3 decimales y NaN', () => {
    const r = compraFormSchema.safeParse({
      items: [
        { ...linea, cantidad: 1.5, costoUnitario: 1.234 },
        { ...linea, productoId: 2, cantidad: Number.NaN },
      ],
    });
    expect(r.success).toBe(false);
    const messages = r.error?.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining(['Debe ser un número entero', 'Máximo 2 decimales', 'Ingrese la cantidad']),
    );
  });

  it('rechaza productos repetidos', () => {
    const r = compraFormSchema.safeParse({ items: [linea, { ...linea }] });
    expect(r.error?.issues[0]?.message).toBe('Hay productos repetidos');
  });
});

describe('productoFormSchema', () => {
  it('normaliza espacios y valida el lote', () => {
    const ok = productoFormSchema.parse({
      nombre: '  Gasa estéril  ',
      nroLote: 'LT-2026/01',
      costo: 0,
    });
    expect(ok.nombre).toBe('Gasa estéril');
    expect(
      productoFormSchema.safeParse({
        nombre: 'Gasa',
        nroLote: "L1'; DROP TABLE",
        costo: 1,
      }).success,
    ).toBe(false);
  });
});
