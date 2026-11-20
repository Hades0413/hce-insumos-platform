'use client';

import { useMemo } from 'react';
import { calcularLinea, calcularTotales, type LineAmounts } from '@hce/domain';

export function useLineTotals<T>(
  items: ReadonlyArray<T> | undefined,
  cantidad: (i: T) => unknown,
  precio: (i: T) => unknown,
) {
  const lineas: LineAmounts[] = useMemo(
    () => (items ?? []).map((i) => calcularLinea(Number(cantidad(i)), Number(precio(i)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los selectores son estables por contrato
    [items],
  );
  const totales = useMemo(() => calcularTotales(lineas), [lineas]);
  return { lineas, totales };
}
