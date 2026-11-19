import { isAxiosError } from 'axios';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'CSRF_INVALID'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONCURRENCY_CONFLICT'
  | 'DUPLICATE'
  | 'STOCK_INSUFICIENTE'
  | 'BUSINESS_RULE'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ApiFieldError {
  field?: string;
  message: string;
  productoId?: number;
  stockDisponible?: number;
  cantidadSolicitada?: number;
  [key: string]: unknown;
}

/** Problem Details (RFC 7807) tal como lo emite el gateway. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  detail?: string;
  instance?: string;
  errors?: ApiFieldError[];
  requestId?: string;
}

const DEFAULT_MESSAGES: Partial<Record<number, string>> = {
  400: 'La solicitud contiene datos inválidos.',
  401: 'Tu sesión expiró. Inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'El registro fue modificado o ya existe.',
  422: 'La operación no cumple una regla de negocio.',
  423: 'Cuenta bloqueada temporalmente por intentos fallidos.',
  429: 'Demasiadas solicitudes. Espera un momento e inténtalo otra vez.',
  502: 'Servicio no disponible. Inténtalo más tarde.',
  503: 'Servicio no disponible. Inténtalo más tarde.',
  504: 'El servicio tardó demasiado en responder.',
};

const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BUSINESS_RULE',
  423: 'ACCOUNT_LOCKED',
  429: 'RATE_LIMITED',
  502: 'UPSTREAM_UNAVAILABLE',
  503: 'UPSTREAM_UNAVAILABLE',
  504: 'UPSTREAM_TIMEOUT',
};

/** Error tipado único que ve toda la UI: nunca un AxiosError crudo. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | (string & {});
  readonly title: string;
  readonly errors: ApiFieldError[];
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(init: {
    status: number;
    code: ApiErrorCode | (string & {});
    message: string;
    title?: string;
    errors?: ApiFieldError[];
    requestId?: string;
    retryAfterSeconds?: number;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.title = init.title ?? init.message;
    this.errors = init.errors ?? [];
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new ApiError({ status: 0, code: 'TIMEOUT', message: 'La solicitud excedió el tiempo de espera.' });
      }
      const response = error.response;
      if (!response) {
        return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.' });
      }
      const body = (typeof response.data === 'object' && response.data !== null ? response.data : {}) as ProblemDetails;
      const status = response.status;
      const retryAfter = Number(response.headers?.['retry-after']);
      return new ApiError({
        status,
        code: body.code ?? CODE_BY_STATUS[status] ?? 'UNKNOWN',
        title: body.title,
        message: body.detail ?? DEFAULT_MESSAGES[status] ?? 'Ocurrió un error inesperado.',
        errors: Array.isArray(body.errors) ? body.errors : [],
        requestId: body.requestId ?? (response.headers?.['x-request-id'] as string | undefined),
        retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined,
      });
    }
    return new ApiError({
      status: 0,
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
    });
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
