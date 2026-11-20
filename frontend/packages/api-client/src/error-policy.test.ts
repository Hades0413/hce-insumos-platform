import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { describeApiError, humanizeField } from './error-messages';
import { shouldRotateIdempotencyKey } from './idempotency';

const err = (status: number, code: string, extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ status, code, message: 'detalle del servidor', ...extra });

describe('shouldRotateIdempotencyKey', () => {
  it.each([
    [0, 'NETWORK_ERROR'],
    [0, 'TIMEOUT'],
    [429, 'RATE_LIMITED'],
    [500, 'INTERNAL_ERROR'],
    [503, 'UPSTREAM_UNAVAILABLE'],
    [504, 'UPSTREAM_TIMEOUT'],
    [422, 'IDEMPOTENCY_CONFLICT'],
  ])('conserva la key ante %i %s (resultado incierto o ya registrado)', (status, code) => {
    expect(shouldRotateIdempotencyKey(err(status, code))).toBe(false);
  });

  it.each([
    [400, 'VALIDATION_ERROR'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONCURRENCY_CONFLICT'],
    [422, 'STOCK_INSUFICIENTE'],
  ])('rota la key ante rechazo definitivo %i %s', (status, code) => {
    expect(shouldRotateIdempotencyKey(err(status, code))).toBe(true);
  });
});

describe('mensajes de error', () => {
  it('humaniza rutas de campo', () => {
    expect(humanizeField('items[1].cantidad')).toBe('Línea 2, cantidad');
    expect(humanizeField('items[0].costoUnitario')).toBe('Línea 1, costo unitario');
    expect(humanizeField('nroLote')).toBe('número de lote');
    expect(humanizeField('__proto__')).toBe('Dato');
  });

  it('no expone mensajes internos en 5xx y agrega referencia', () => {
    const d = describeApiError(err(500, 'INTERNAL_ERROR', { requestId: 'req-9' }));
    expect(d.message).not.toContain('detalle del servidor');
    expect(d.reference).toBe('req-9');
  });

  it('usa el detalle del servidor en reglas de negocio con errores por línea', () => {
    const d = describeApiError(
      err(422, 'STOCK_INSUFICIENTE', {
        errors: [{ field: 'items[2].cantidad', message: 'Supera el stock' }],
      }),
    );
    expect(d.message).toBe('detalle del servidor');
    expect(d.details).toEqual(['Línea 3, cantidad: Supera el stock']);
    expect(d.reference).toBeUndefined();
  });
});
