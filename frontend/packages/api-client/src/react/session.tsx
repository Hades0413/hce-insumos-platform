'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { permisosEfectivos, tienePermiso, type Permiso } from '@hce/domain';
import { api, subscribePermissionsChanged } from '../client';
import { publishSessionEvent, subscribeSessionEvents } from '../session-channel';
import { queryKeys } from './query-keys';
import type { SessionDto } from '../types';

export const LOGGED_OUT_PATH = '/login?out=1';

export function useSession() {
  return useQuery<SessionDto>({
    queryKey: queryKeys.session,
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      publishSessionEvent('logout');
      window.location.assign(LOGGED_OUT_PATH);
    },
  });
}

export function useSessionSync(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const refetchSession = () => void qc.invalidateQueries({ queryKey: queryKeys.session });
    const offPermissions = subscribePermissionsChanged(refetchSession);
    const offSession = subscribeSessionEvents((event) => {
      if (event === 'logout') {
        if (!window.location.pathname.startsWith('/login')) window.location.assign(LOGGED_OUT_PATH);
      } else {
        refetchSession();
      }
    });
    return () => {
      offPermissions();
      offSession();
    };
  }, [qc]);
}

export function usePermisos(): ReadonlyArray<Permiso> | undefined {
  const { data } = useSession();
  return data ? permisosEfectivos(data.user) : undefined;
}

export function usePermiso(permiso: Permiso): boolean {
  return tienePermiso(usePermisos(), permiso);
}

interface CanProps {
  permiso: Permiso;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ permiso, fallback = null, children }: CanProps) {
  const permisos = usePermisos();
  if (permisos === undefined) return null;
  return <>{tienePermiso(permisos, permiso) ? children : fallback}</>;
}
