import { AppError } from '@hce/core';
import { ErrorCode } from '@hce/contracts';
import { Producto } from '../producto/producto';
import { Money } from '../shared/money';
import { PoliticaPrecios } from '../shared/politica-precios';
import { MENSAJE_STOCK_INSUFICIENTE, Venta } from './venta';

const politica = PoliticaPrecios.fromRates(0.18, 0.35);
const producto = (id: number, stock: number, precio: number) =>
  Producto.rehidratar({
    id,
    nombre: `P${id}`,
    nroLote: 'L1',
    fecRegistro: new Date(),
    costo: Money.ZERO,
    precioVenta: Money.fromDecimal(precio),
    stock,
    rowVersion: 'AAAAAAAAB+s=',
  });

describe('Venta (agregado)', () => {
  const productos = new Map([
    [1, producto(1, 10, 0.2)],
    [2, producto(2, 2, 5.13)],
  ]);

  it('usa el precio de venta del servidor y calcula Subtotal/IGV/Total', () => {
    const venta = Venta.registrar([{ productoId: 1, cantidad: 10 }], productos, politica);
    expect(venta.lineas[0].precio.toDecimal()).toBe(0.2);
    expect(venta.totales.subTotal.toDecimal()).toBe(2);
    expect(venta.totales.igv.toDecimal()).toBe(0.36);
    expect(venta.totales.total.toDecimal()).toBe(2.36);
  });

  it('no permite cantidad mayor al stock e informa cada línea', () => {
    expect.assertions(4);
    try {
      Venta.registrar(
        [
          { productoId: 1, cantidad: 1 },
          { productoId: 2, cantidad: 3 },
        ],
        productos,
        politica,
      );
    } catch (e) {
      const err = e as AppError;
      expect(err.code).toBe(ErrorCode.STOCK_INSUFICIENTE);
      expect(err.message).toBe(MENSAJE_STOCK_INSUFICIENTE);
      expect(err.details).toHaveLength(1);
      expect(err.details?.[0]).toMatchObject({ field: 'items[1].cantidad', productoId: 2, stockDisponible: 2 });
    }
  });

  it('rechaza productos inexistentes', () => {
    expect(() => Venta.registrar([{ productoId: 99, cantidad: 1 }], productos, politica)).toThrow(
      expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
    );
  });
});
