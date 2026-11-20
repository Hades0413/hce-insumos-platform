'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { uuidv4 } from '@hce/domain';
import { ApiError } from '../api-error';
import { shouldRotateIdempotencyKey } from '../idempotency';

type Options<TData, TVars> = Omit<UseMutationOptions<TData, ApiError, TVars>, 'mutationFn'> & {
  mutationFn: (vars: TVars, idempotencyKey: string) => Promise<TData>;
};

export function useIdempotentMutation<TData, TVars>({
  mutationFn,
  onSuccess,
  onError,
  ...rest
}: Options<TData, TVars>) {
  const key = useRef<string>(uuidv4());
  const rotate = useCallback(() => {
    key.current = uuidv4();
  }, []);

  const mutation = useMutation<TData, ApiError, TVars>({
    ...rest,
    mutationFn: (vars) => mutationFn(vars, key.current).catch((e: unknown) => Promise.reject(ApiError.from(e))),
    onSuccess: (...args) => {
      rotate();
      return onSuccess?.(...args);
    },
    onError: (error, ...args) => {
      if (shouldRotateIdempotencyKey(error)) rotate();
      return onError?.(error, ...args);
    },
  });
  return mutation;
}
