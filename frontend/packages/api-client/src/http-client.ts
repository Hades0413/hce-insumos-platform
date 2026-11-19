import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { uuidv4 } from '@hce/domain';
import { ApiError } from './api-error';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** No intentar refresh ante 401 (login, refresh, csrf). */
    skipAuthRefresh?: boolean;
    /** Marcas internas para garantizar como máximo UN reintento por causa. */
    _authRetried?: boolean;
    _csrfRetried?: boolean;
  }
}

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/csrf', '/auth/logout'];

export interface HttpClientOptions {
  baseURL: string;
  timeoutMs?: number;
  /** Se invoca cuando la sesión no se puede recuperar (refresh falló). */
  onSessionExpired?: () => void;
}

export interface HttpClient {
  instance: AxiosInstance;
  /** Olvida el token CSRF (p. ej. tras logout). */
  resetCsrf: () => void;
}

const isAuthEndpoint = (url: string | undefined): boolean =>
  !!url && AUTH_ENDPOINTS.some((p) => url.endsWith(p) || url.includes(`${p}?`));

/**
 * Cliente HTTP con interceptores de seguridad.
 *
 * - El JWT vive en cookies HttpOnly: este código NUNCA lo lee ni lo guarda
 *   (mitiga robo de tokens por XSS). Solo se activa `withCredentials`.
 * - REQUEST: `X-Request-Id` (trazabilidad end-to-end) y `X-CSRF-Token` en métodos
 *   que mutan estado (double-submit contra CSRF). El token CSRF se obtiene de
 *   forma perezosa y deduplicada: N peticiones simultáneas => 1 sola llamada.
 * - RESPONSE: 401 => UN refresh "single-flight" compartido por todas las peticiones
 *   que fallaron a la vez; luego reintenta cada una una sola vez. Si el refresh
 *   falla => `onSessionExpired`. 403 CSRF_INVALID => renueva CSRF y reintenta una vez.
 *   Todo error sale normalizado como `ApiError` (RFC 7807).
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeoutMs ?? 15_000,
    withCredentials: true,
    headers: { Accept: 'application/json' },
    // El gateway valida CSRF con su propio header; desactivamos el XSRF automático de axios.
    xsrfCookieName: undefined,
    xsrfHeaderName: undefined,
  });

  let csrfToken: string | null = null;
  let csrfPromise: Promise<string> | null = null;
  let refreshPromise: Promise<void> | null = null;

  const fetchCsrf = (): Promise<string> => {
    if (csrfToken) return Promise.resolve(csrfToken);
    csrfPromise ??= instance
      .get<{ csrfToken: string }>('/auth/csrf', { skipAuthRefresh: true })
      .then((res) => {
        csrfToken = res.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
    return csrfPromise;
  };

  const refreshSession = (): Promise<void> => {
    refreshPromise ??= instance
      .post('/auth/refresh', undefined, { skipAuthRefresh: true })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const headers = AxiosHeaders.from(config.headers);
    if (!headers.has('X-Request-Id')) headers.set('X-Request-Id', uuidv4());
    const method = (config.method ?? 'get').toLowerCase();
    if (UNSAFE_METHODS.has(method)) {
      headers.set('X-CSRF-Token', await fetchCsrf());
    }
    config.headers = headers;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config;
      const apiError = ApiError.from(error);
      if (!config) throw apiError;

      // 403 por CSRF: el secreto rotó (login/logout/expiración) -> renovar y reintentar 1 vez.
      if (apiError.status === 403 && apiError.code === 'CSRF_INVALID' && !config._csrfRetried) {
        config._csrfRetried = true;
        csrfToken = null;
        return instance.request(config);
      }

      // 401: access token vencido -> refresh compartido + reintento único.
      if (
        apiError.status === 401 &&
        !config.skipAuthRefresh &&
        !config._authRetried &&
        !isAuthEndpoint(config.url)
      ) {
        config._authRetried = true;
        try {
          await refreshSession();
        } catch {
          csrfToken = null;
          options.onSessionExpired?.();
          throw apiError;
        }
        return instance.request(config);
      }

      throw apiError;
    },
  );

  return {
    instance,
    resetCsrf: () => {
      csrfToken = null;
    },
  };
}

/** Redirección por defecto al login preservando la ruta actual (validada en el login). */
export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login')) return;
  const next = encodeURIComponent(`${pathname}${search}`);
  window.location.assign(`/login?next=${next}`);
}
