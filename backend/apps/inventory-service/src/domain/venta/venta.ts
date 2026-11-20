import { AggregateRoot } from '@hce/core';
import { AppError } from '@hce/core';
import { ErrorCode, ErrorDetail } from '@hce/contracts';
import { Producto } from '../producto/producto';
import { validarCantidad, validarId } from '../shared/cantidad';
import { LineaDocumento, TotalesDocumento, totalizar, validarEstructura } from '../shared/documento';
import { documentoRegistrado, EVENTOS_INVENTARIO } from '../shared/eventos';
import { PoliticaPrecios } from '../shared/politica-precios';

export interface ItemVenta {
  readonly productoId: number;
  readonly cantidad: number;
}

export const MENSAJE_STOCK_INSUFICIENTE = 'La cantidad no debe ser mayor al stock';

export interface ConflictoStock {
  readonly productoId: number;
  readonly stockDisponible: number;
  readonly cantidadSolicitada: number;
}

export function errorStockInsuficiente(conflictos: readonly ConflictoStock[], indices?: Map<number, number>): AppError {
  const details: ErrorDetail[] = conflictos.map((c) => ({
    field: indices?.has(c.productoId) ? `items[${indices.get(c.productoId)}].cantidad` : 'items',
    message: `${MENSAJE_STOCK_INSUFICIENTE} (stock disponible: ${c.stockDisponible}).`,
    productoId: c.productoId,
    stockDisponible: c.stockDisponible,
    cantidadSolicitada: c.cantidadSolicitada,
  }));
  return new AppError(ErrorCode.STOCK_INSUFICIENTE, MENSAJE_STOCK_INSUFICIENTE, details);
}

export class Venta extends AggregateRoot {
  private constructor(
    readonly lineas: readonly LineaDocumento[],
    readonly totales: TotalesDocumento,
  ) {
    super();
    this.record(documentoRegistrado(EVENTOS_INVENTARIO.VENTA_REGISTRADA, lineas, totales));
  }

  static registrar(
    items: readonly ItemVenta[],
    productos: ReadonlyMap<number, Producto>,
    politica: PoliticaPrecios,
  ): Venta {
    validarEstructura(items, 'venta');

    const inexistentes: ErrorDetail[] = [];
    const sinStock: ConflictoStock[] = [];
    const indices = new Map<number, number>();
    const lineas: LineaDocumento[] = [];

    items.forEach((item, i) => {
      const productoId = validarId(item.productoId, `items[${i}].productoId`);
      const cantidad = validarCantidad(item.cantidad, `items[${i}].cantidad`);
      indices.set(productoId, i);
      const producto = productos.get(productoId);
      if (!producto) {
        inexistentes.push({ field: `items[${i}].productoId`, message: 'El producto no existe', productoId });
        return;
      }
      if (!producto.tieneStockPara(cantidad)) {
        sinStock.push({ productoId, stockDisponible: producto.stock, cantidadSolicitada: cantidad });
        return;
      }
      lineas.push({
        productoId,
        cantidad,
        precio: producto.precioVenta,
        ...politica.calcularLinea(cantidad, producto.precioVenta),
      });
    });

    if (inexistentes.length) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Uno o más productos no existen.', inexistentes);
    }
    if (sinStock.length) {
      throw errorStockInsuficiente(sinStock, indices);
    }
    return new Venta(lineas, totalizar(lineas));
  }

  get productoIds(): number[] {
    return this.lineas.map((l) => l.productoId);
  }
}
