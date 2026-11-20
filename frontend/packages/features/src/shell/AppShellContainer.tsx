'use client';

import type { ReactNode } from 'react';
import { useLogout, usePermisos, useSession } from '@hce/api-client/react';
import { NAV_ITEMS, navParaPermisos, ROL_LABEL, type ZoneKey } from '@hce/domain';
import { AppShell, useToast } from '@hce/ui';
import { errorMessage } from '../errors/ApiErrorNotice';

const SITE_LABEL = process.env.NEXT_PUBLIC_SITE_LABEL ?? 'Sede principal, farmacia central';

export interface AppShellContainerProps {
  zone: ZoneKey;
  subnav?: ReactNode;
  section?: string;
  children: ReactNode;
}

export function AppShellContainer({ zone, subnav, section, children }: AppShellContainerProps) {
  const { data: session, isPending, isError } = useSession();
  const permisos = usePermisos();
  const logout = useLogout();
  const toast = useToast();
  const zoneLabel = NAV_ITEMS.find((i) => i.key === zone)?.label ?? '';

  const onLogout = () =>
    logout.mutate(undefined, {
      onError: (e) => toast.error('La sesión sigue abierta', `No se pudo cerrar sesión. ${errorMessage(e)}`),
    });

  return (
    <AppShell
      nav={navParaPermisos(permisos)}
      activeZone={zone}
      status={isPending ? 'loading' : isError ? 'error' : 'ready'}
      user={
        session
          ? {
              nombre: session.user.nombreCompleto,
              rolLabel: ROL_LABEL[session.user.rol],
              email: session.user.email,
              sessionExpiresAt: session.accessTokenExpiresAt,
            }
          : undefined
      }
      onLogout={onLogout}
      loggingOut={logout.isPending || logout.isSuccess}
      subnav={subnav}
      breadcrumb={section && section !== zoneLabel ? [zoneLabel, section] : [zoneLabel]}
      siteLabel={SITE_LABEL}
    >
      {children}
    </AppShell>
  );
}
