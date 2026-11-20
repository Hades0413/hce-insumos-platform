import { describe, expect, it } from 'vitest';
import { formatPEN, toCents } from './money';
import { calcularLinea, calcularTotales, precioVentaDesdeCosto } from './pricing';
import { safeNextPath } from './navigation';

describe('money', () => {
  it('convierte a céntimos sin error binario', () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(-2.555)).toBe(-256);
  });
  it('formatea en soles', () => {
    expect(formatPEN(1234.5)).toMatch(/1,234\.50/);
  });
});

describe('calcularLinea', () => {
  it('subtotal = cantidad × precio; IGV 18%; total = subtotal + igv', () => {
    expect(calcularLinea(3, 10.5)).toEqual({
      subTotal: 31.5,
      igv: 5.67,
      total: 37.17,
    });
  });
  it('redondea el IGV half-up a 2 decimales', () => {
    expect(calcularLinea(1, 0.25)).toEqual({
      subTotal: 0.25,
      igv: 0.05,
      total: 0.3,
    });
  });
  it('entradas inválidas producen ceros', () => {
    expect(calcularLinea(Number.NaN, 10)).toEqual({
      subTotal: 0,
      igv: 0,
      total: 0,
    });
    expect(calcularLinea(0, 10)).toEqual({ subTotal: 0, igv: 0, total: 0 });
  });
  it('totales sin acumular errores de coma flotante', () => {
    const lineas = Array.from({ length: 10 }, () => calcularLinea(1, 0.1));
    expect(calcularTotales(lineas)).toEqual({
      subTotal: 1,
      igv: 0.2,
      total: 1.2,
    });
  });
});

describe('precioVentaDesdeCosto', () => {
  it('aplica costo × 1.35 redondeado', () => {
    expect(precioVentaDesdeCosto(10)).toBe(13.5);
    expect(precioVentaDesdeCosto(3.33)).toBe(4.5);
    expect(precioVentaDesdeCosto(-1)).toBe(0);
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/compras?x=1', '/compras?x=1'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['https://evil.com', '/'],
    ['javascript:alert(1)', '/'],
    [null, '/'],
  ])('%s -> %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
