import { AppError } from '@hce/common/errors/app-error';
import { ErrorCode } from '@hce/contracts';
import { PoliticaPrecios } from '../shared/politica-precios';
import { Compra } from './compra';

const politica = PoliticaPrecios.fromRates(0.18, 0.35);

describe('Compra (agregado)', () => {
  it('calcula líneas, totales y nuevo precio de venta (costo × 1.35)', () => {
    const compra = Compra.registrar(
      [
        { productoId: 9, cantidad: 50, costoUnitario: 0.5 },
        { productoId: 8, cantidad: 10, costoUnitario: 0.2 },
      ],
      politica,
    );
    expect(compra.totales.subTotal.toDecimal()).toBe(27);
    expect(compra.totales.igv.toDecimal()).toBe(4.86);
    expect(compra.totales.total.toDecimal()).toBe(31.86);
    expect(compra.lineas[0].nuevoPrecioVenta.toDecimal()).toBe(0.68);
  });

  it.each([
    [[], 'sin líneas'],
    [[{ productoId: 1, cantidad: 0, costoUnitario: 1 }], 'cantidad 0'],
    [[{ productoId: 1, cantidad: 1.5, costoUnitario: 1 }], 'cantidad decimal'],
    [
      [
        { productoId: 1, cantidad: 1, costoUnitario: 1 },
        { productoId: 1, cantidad: 2, costoUnitario: 1 },
      ],
      'producto repetido',
    ],
  ])('rechaza documento inválido: %#', (items) => {
    try {
      Compra.registrar(items, politica);
      fail('debió fallar');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });
});
