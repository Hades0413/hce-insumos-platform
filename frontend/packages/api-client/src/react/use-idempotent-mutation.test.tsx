// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api-error';
import { useIdempotentMutation } from './use-idempotent-mutation';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

function setup(outcomes: Array<'ok' | ApiError>) {
  const keys: string[] = [];
  const mutationFn = vi.fn((_: number, key: string) => {
    keys.push(key);
    const next = outcomes.shift();
    return next === 'ok' ? Promise.resolve('ok') : Promise.reject(next);
  });
  const { result } = renderHook(() => useIdempotentMutation<string, number>({ mutationFn }), { wrapper });
  const run = async () => {
    await act(async () => {
      await result.current.mutateAsync(1).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
  };
  return { keys, run };
}

const err = (status: number, code: string) => new ApiError({ status, code, message: code });

describe('useIdempotentMutation', () => {
  it('conserva la key tras un fallo de red (el reintento no duplica) y rota tras el éxito', async () => {
    const { keys, run } = setup([err(0, 'NETWORK_ERROR'), 'ok', 'ok']);
    await run();
    await run();
    await run();
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('rota la key tras un rechazo definitivo (422 stock) y la conserva ante IDEMPOTENCY_CONFLICT', async () => {
    const { keys, run } = setup([err(422, 'STOCK_INSUFICIENTE'), err(422, 'IDEMPOTENCY_CONFLICT'), 'ok']);
    await run();
    await run();
    await run();
    expect(keys[1]).not.toBe(keys[0]);
    expect(keys[2]).toBe(keys[1]);
  });
});
