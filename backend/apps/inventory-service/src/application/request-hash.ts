import { createHash } from 'node:crypto';
import { AppError } from '@hce/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validarIdempotencyKey(key: unknown): string {
  if (typeof key !== 'string' || !UUID_REGEX.test(key)) {
    throw AppError.validation('Idempotency-Key debe ser un UUID válido.', [
      { field: 'Idempotency-Key', message: 'UUID requerido' },
    ]);
  }
  return key.toLowerCase();
}

/**
 * Huella del payload: detecta que una misma Idempotency-Key se reutilice con un
 * contenido distinto (422 en lugar de devolver silenciosamente otro documento).
 */
export function hashItems(items: readonly object[]): Buffer {
  const canonical = [...items]
    .map((i) => Object.fromEntries(Object.entries(i).sort(([a], [b]) => a.localeCompare(b))))
    .sort((a, b) => Number(a.productoId) - Number(b.productoId));
  return createHash('sha256').update(JSON.stringify(canonical)).digest();
}
