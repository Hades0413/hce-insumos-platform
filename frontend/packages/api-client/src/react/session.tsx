'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { tienePermiso, type Permiso, type Rol } from '@hce/domain';
import { api } from '../client';
import { queryKeys } from './query-keys';
import type { SessionDto } from '../types';

/** Sesión actual (GET /auth/me). El rol viene del JWT validado por el gateway. */
export function useSession() {
  return useQuery<SessionDto>({
    queryKey: queryKeys.session,
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    try {
      await api.auth.logout();
    } finally {
      qc.clear();
      window.location.assign('/login');
    }
  };
}

export function usePermiso(permiso: Permiso): boolean {
  const { data } = useSession();
  return tienePermiso(data?.user.rol, permiso);
}

interface RoleGateProps {
  /** Permiso requerido (preferido) … */
  permiso?: Permiso;
  /** … o lista explícita de roles. */
  roles?: ReadonlyArray<Rol>;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Oculta UI según rol. ES SOLO UX: la autorización real la aplica el gateway
 * (OWASP A01 — nunca confiar en el control de acceso del cliente).
 */
export function RoleGate({ permiso, roles, fallback = null, children }: RoleGateProps) {
  const { data, isPending } = useSession();
  if (isPending) return null;
  const rol = data?.user.rol;
  const allowed = permiso ? tienePermiso(rol, permiso) : roles ? rol !== undefined && roles.includes(rol) : true;
  return <>{allowed ? children : fallback}</>;
}
