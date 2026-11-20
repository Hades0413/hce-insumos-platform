import axios, { AxiosHeaders, type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { uuidv4 } from '@hce/domain';
import { ApiError } from './api-error';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _authRetried?: boolean;
    _csrfRetried?: boolean;
    _tabRetried?: boolean;
  }
}

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/csrf', '/auth/logout'];

export interface HttpClientOptions {
  baseURL: string;
  timeoutMs?: number;
  onSessionExpired?: () => void;
  onPermissionsChanged?: () => void;
}

export interface HttpClient {
  instance: AxiosInstance;
  resetCsrf: () => void;
}

const CROSS_TAB_RETRY_DELAY_MS = 300;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isAuthEndpoint = (url: string | undefined): boolean =>
  !!url && AUTH_ENDPOINTS.some((p) => url.endsWith(p) || url.includes(`${p}?`));

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeoutMs ?? 15_000,
    withCredentials: true,
    headers: { Accept: 'application/json' },
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
    if (method !== 'delete' && UNSAFE_METHODS.has(method) && config.data === undefined) {
      config.data = {};
      headers.set('Content-Type', 'application/json');
    }
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

      if (apiError.status === 403 && apiError.code === 'CSRF_INVALID' && !config._csrfRetried) {
        config._csrfRetried = true;
        csrfToken = null;
        return instance.request(config);
      }

      if (apiError.status === 401 && !config.skipAuthRefresh && !config._authRetried && !isAuthEndpoint(config.url)) {
        config._authRetried = true;
        try {
          await refreshSession();
        } catch (refreshError: unknown) {
          const refreshApiError = ApiError.from(refreshError);
          if (refreshApiError.status !== 401 && refreshApiError.status !== 403) throw refreshApiError;
          csrfToken = null;
          if (config._tabRetried) {
            options.onSessionExpired?.();
            throw apiError;
          }
          config._tabRetried = true;
          await sleep(CROSS_TAB_RETRY_DELAY_MS);
          try {
            return await instance.request(config);
          } catch (retryError: unknown) {
            const retryApiError = ApiError.from(retryError);
            if (retryApiError.status === 401) options.onSessionExpired?.();
            throw retryApiError;
          }
        }
        if (apiError.code === 'PERMISSIONS_CHANGED') options.onPermissionsChanged?.();
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

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login')) return;
  const next = encodeURIComponent(`${pathname}${search}`);
  window.location.assign(`/login?next=${next}`);
}
