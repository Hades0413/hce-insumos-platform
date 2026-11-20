import type { ApiError } from './api-error';

export function shouldRotateIdempotencyKey(error: ApiError): boolean {
  if (error.transient) return false;
  if (error.code === 'IDEMPOTENCY_CONFLICT') return false;
  return error.status >= 400 && error.status < 500;
}
