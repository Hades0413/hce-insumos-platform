import { AppError } from '@hce/core';
import { Money } from './money';

export const MAX_LINEAS_POR_DOCUMENTO = 100;

export interface LineaDocumento {
  readonly productoId: number;
  readonly cantidad: number;
  readonly precio: Money;
  readonly subTotal: Money;
  readonly igv: Money;
  readonly total: Money;
}

export interface TotalesDocumento {
  readonly subTotal: Money;
  readonly igv: Money;
  readonly total: Money;
}

export function totalizar(lineas: readonly LineaDocumento[]): TotalesDocumento {
  const subTotal = Money.sum(lineas.map((l) => l.subTotal));
  const igv = Money.sum(lineas.map((l) => l.igv));
  return { subTotal, igv, total: subTotal.add(igv) };
}

export function validarEstructura(items: unknown, tipo: string): asserts items is readonly { productoId: number }[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.validation(`La ${tipo} debe tener al menos un producto.`, [
      { field: 'items', message: 'Requerido' },
    ]);
  }
  if (items.length > MAX_LINEAS_POR_DOCUMENTO) {
    throw AppError.validation(`La ${tipo} admite como máximo ${MAX_LINEAS_POR_DOCUMENTO} productos.`, [
      { field: 'items', message: `Máximo ${MAX_LINEAS_POR_DOCUMENTO}` },
    ]);
  }
  const vistos = new Set<number>();
  (items as { productoId: number }[]).forEach((item, index) => {
    if (vistos.has(item.productoId)) {
      throw AppError.validation('Hay productos repetidos en el documento; agrupe las cantidades en una sola línea.', [
        { field: `items[${index}].productoId`, message: 'Producto repetido', productoId: item.productoId },
      ]);
    }
    vistos.add(item.productoId);
  });
}
