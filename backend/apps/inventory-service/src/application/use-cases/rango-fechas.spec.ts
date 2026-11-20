import { validarRango } from './rango-fechas';

describe('validarRango', () => {
  it.each(['2026-02-31', '0000-01-01', '9999-12-31', '2026-13-01', '26-01-01'])('rechaza %s', (fecha) => {
    expect(() => validarRango(fecha)).toThrow();
  });
  it('acepta un rango válido y rechaza desde > hasta', () => {
    expect(validarRango('2026-01-01', '2026-12-31')).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
    expect(() => validarRango('2026-12-31', '2026-01-01')).toThrow();
  });
});
