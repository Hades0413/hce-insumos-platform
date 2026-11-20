'use client';

import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import type { Paginated } from '../types';

export interface PaginatedQueryOptions<R extends Paginated<unknown>> {
  queryKey: (page: number) => QueryKey;
  queryFn: (page: number) => Promise<R>;
  enabled?: boolean;
}

export function usePaginatedQuery<R extends Paginated<unknown>>({
  queryKey,
  queryFn,
  enabled = true,
}: PaginatedQueryOptions<R>) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: queryKey(page),
    queryFn: () => queryFn(page),
    placeholderData: keepPreviousData,
    enabled,
  });

  const lastPage = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize)) : undefined;
  if (lastPage !== undefined && page > lastPage) setPage(lastPage);

  return { ...query, page, setPage, resetPage: () => setPage(1) };
}
