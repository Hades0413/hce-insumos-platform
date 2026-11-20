import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api-error';

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
