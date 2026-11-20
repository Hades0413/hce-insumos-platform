import { AggregateRoot } from '@hce/core';
import { validarCantidad, validarId } from '../shared/cantidad';
import { LineaDocumento, TotalesDocumento, totalizar, validarEstructura } from '../shared/documento';
import { documentoRegistrado, EVENTOS_INVENTARIO } from '../shared/eventos';
import { Money } from '../shared/money';
import { PoliticaPrecios } from '../shared/politica-precios';

export interface ItemCompra {
  readonly productoId: number;
  readonly cantidad: number;
  readonly costoUnitario: number;
}

export interface LineaCompra extends LineaDocumento {
  readonly nuevoPrecioVenta: Money;
}

export class Compra extends AggregateRoot {
  private constructor(
    readonly lineas: readonly LineaCompra[],
    readonly totales: TotalesDocumento,
  ) {
    super();
    this.record(documentoRegistrado(EVENTOS_INVENTARIO.COMPRA_REGISTRADA, lineas, totales));
  }

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
