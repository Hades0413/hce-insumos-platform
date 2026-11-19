import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api-error';

/**
 * Política de caché/reintentos:
 * - Solo se reintentan fallos transitorios (red / 5xx), nunca 4xx (no tiene sentido
 *   reintentar un 403 o un 422) — evita amplificar carga sobre el backend.
 * - staleTime moderado: reduce peticiones repetidas sin mostrar datos obsoletos.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const e = ApiError.from(error);
          const transient = e.status === 0 || e.status >= 500;
          return transient && failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
