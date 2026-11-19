import { AppError } from '@hce/common/errors/app-error';
import { Money } from './money';
import { PoliticaPrecios } from './politica-precios';

describe('Money', () => {
  it('opera en céntimos sin errores de coma flotante', () => {
    expect(Money.fromDecimal(0.1).add(Money.fromDecimal(0.2)).toDecimal()).toBe(0.3);
    expect(Money.fromDecimal(1.15).times(3).toDecimal()).toBe(3.45);
  });

  it('rechaza más de 2 decimales y negativos', () => {
    expect(() => Money.fromDecimal(1.005)).toThrow(AppError);
    expect(() => Money.fromDecimal(-1)).toThrow(AppError);
    expect(() => Money.fromDecimal(Number.NaN)).toThrow(AppError);
  });

  it('aplica tasas con redondeo half-up al céntimo', () => {
    expect(Money.fromDecimal(0.81).applyRate(1800).toDecimal()).toBe(0.15); // 0.1458 -> 0.15
    expect(Money.fromCents(25).applyRate(1800).cents).toBe(5); // 4.5 -> 5
  });
});

describe('PoliticaPrecios', () => {
  const politica = PoliticaPrecios.fromRates(0.18, 0.35);

  it('precio de venta = costo × 1.35', () => {
    expect(politica.precioVentaDesdeCosto(Money.fromDecimal(0.4)).toDecimal()).toBe(0.54);
    expect(politica.precioVentaDesdeCosto(Money.fromDecimal(3.8)).toDecimal()).toBe(5.13);
  });

  it('Subtotal = cantidad × precio, IGV = 18% del subtotal, Total = Subtotal + IGV', () => {
    const r = politica.calcularLinea(3, Money.fromDecimal(0.27));
    expect(r.subTotal.toDecimal()).toBe(0.81);
    expect(r.igv.toDecimal()).toBe(0.15);
    expect(r.total.toDecimal()).toBe(0.96);
  });
});
