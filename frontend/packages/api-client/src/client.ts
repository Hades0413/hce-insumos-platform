import { createApi, type Api } from './endpoints';
import { createHttpClient, redirectToLogin } from './http-client';

/**
 * URL del gateway. `NEXT_PUBLIC_*` se inyecta en build por Next (este paquete se
 * transpila con `transpilePackages`). Fallback solo para desarrollo local.
 */
export const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const httpClient = createHttpClient({ baseURL: API_BASE_URL, onSessionExpired: redirectToLogin });

/** Singleton por pestaña: comparte token CSRF y refresh single-flight. */
export const api: Api = createApi(httpClient.instance, httpClient.resetCsrf);
