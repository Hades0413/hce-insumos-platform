/**
 * Códigos de error de negocio/técnicos compartidos. Los microservicios NO conocen
 * HTTP: emiten un código; el API Gateway lo traduce a status HTTP (RFC 7807).
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_INVALID: 'CSRF_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE: 'DUPLICATE',
  CONCURRENCY_CONFLICT: 'CONCURRENCY_CONFLICT',
  HAS_MOVEMENTS: 'HAS_MOVEMENTS',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  STOCK_INSUFICIENTE: 'STOCK_INSUFICIENTE',
  BUSINESS_RULE: 'BUSINESS_RULE',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  CSRF_INVALID: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DUPLICATE: 409,
  CONCURRENCY_CONFLICT: 409,
  HAS_MOVEMENTS: 409,
  IDEMPOTENCY_CONFLICT: 422,
  STOCK_INSUFICIENTE: 422,
  BUSINESS_RULE: 422,
  ACCOUNT_LOCKED: 423,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  UPSTREAM_UNAVAILABLE: 503,
  UPSTREAM_TIMEOUT: 504,
};

export interface ErrorDetail {
  readonly field?: string;
  readonly message: string;
  readonly [key: string]: unknown;
}

/** Payload serializable que cruza NATS dentro de una RpcException. */
export interface RpcErrorPayload {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: readonly ErrorDetail[];
}

export function isRpcErrorPayload(value: unknown): value is RpcErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === 'string' && typeof v.message === 'string' && v.code in ERROR_HTTP_STATUS;
}
