export const COOKIE_NAMES = {
  ACCESS: 'hce_at',
  REFRESH: 'hce_rt',
  CSRF: 'hce_csrf',
} as const;

export const CSRF_HEADER = 'x-csrf-token';
export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const REQUEST_ID_HEADER = 'x-request-id';
