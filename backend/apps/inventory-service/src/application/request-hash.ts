import { createHash } from 'node:crypto';
import { AppError } from '@hce/core';
import { ErrorCode } from '@hce/contracts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validarIdempotencyKey(key: unknown): string {
  if (typeof key !== 'string' || !UUID_REGEX.test(key)) {
    throw AppError.validation('Idempotency-Key debe ser un UUID válido.', [
      { field: 'Idempotency-Key', message: 'UUID requerido' },
    ]);
  }
  return key.toLowerCase();
}

export function hashItems(items: readonly object[], userId: string): Buffer {
  const canonical = [...items]
    .map((i) => Object.fromEntries(Object.entries(i).sort(([a], [b]) => a.localeCompare(b))))
    .sort((a, b) => Number(a.productoId) - Number(b.productoId));
  return createHash('sha256').update(userId).update('\u0000').update(JSON.stringify(canonical)).digest();
}

export function resolverReintento(
  previo: { id: number; requestHash: Buffer } | null,
  requestHash: Buffer,
): number | null {
  if (!previo) return null;
  if (!previo.requestHash.equals(requestHash)) {
    throw new AppError(
      ErrorCode.IDEMPOTENCY_CONFLICT,
      'La Idempotency-Key ya fue usada con un contenido distinto. Genere una nueva para un documento nuevo.',
    );
  }
  return previo.id;
}
