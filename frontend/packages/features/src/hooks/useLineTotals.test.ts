// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLineTotals } from './useLineTotals';

describe('useLineTotals', () => {
  it('calcula por línea y totales en céntimos (IGV 18 % del subtotal)', () => {
    const items = [
      { cantidad: 3, precio: 0.27 },
      { cantidad: 10, precio: 0.2 },
    ];
    const { result } = renderHook(() =>
      useLineTotals(
        items,
        (i) => i.cantidad,
        (i) => i.precio,
      ),
    );
    expect(result.current.lineas[0]).toEqual({
      subTotal: 0.81,
      igv: 0.15,
      total: 0.96,
    });
    expect(result.current.totales).toEqual({
      subTotal: 2.81,
      igv: 0.51,
      total: 3.32,
    });
  });

  it('líneas incompletas (NaN) cuentan como cero', () => {
    const { result } = renderHook(() =>
      useLineTotals(
        [{ cantidad: Number.NaN, precio: 5 }],
        (i) => i.cantidad,
        (i) => i.precio,
      ),
    );
    expect(result.current.totales.total).toBe(0);
  });
});
