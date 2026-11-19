import { validarCantidad, validarId } from '../shared/cantidad';
import { LineaDocumento, TotalesDocumento, totalizar, validarEstructura } from '../shared/documento';
import { Money } from '../shared/money';
import { PoliticaPrecios } from '../shared/politica-precios';

export interface ItemCompra {
  readonly productoId: number;
  readonly cantidad: number;
  readonly costoUnitario: number;
}

export interface LineaCompra extends LineaDocumento {
  /** Nuevo precio de venta del producto = costo × 1.35 (regla del enunciado). */
  readonly nuevoPrecioVenta: Money;
}

/**
 * Agregado Compra: garantiza que cabecera y detalle sean consistentes y que el
 * nuevo precio de venta de cada producto se derive del costo de compra.
 */
export class Compra {
  private constructor(
    readonly lineas: readonly LineaCompra[],
    readonly totales: TotalesDocumento,
  ) {}

  static registrar(items: readonly ItemCompra[], politica: PoliticaPrecios): Compra {
    validarEstructura(items, 'compra');
    const lineas = items.map((item, i): LineaCompra => {
      const productoId = validarId(item.productoId, `items[${i}].productoId`);
      const cantidad = validarCantidad(item.cantidad, `items[${i}].cantidad`);
      const precio = Money.fromDecimal(item.costoUnitario, `items[${i}].costoUnitario`);
      const importes = politica.calcularLinea(cantidad, precio);
      return { productoId, cantidad, precio, ...importes, nuevoPrecioVenta: politica.precioVentaDesdeCosto(precio) };
    });
    return new Compra(lineas, totalizar(lineas));
  }

  get productoIds(): number[] {
    return this.lineas.map((l) => l.productoId);
  }
}
