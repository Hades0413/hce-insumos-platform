'use client';

import type { ReactNode } from 'react';
import { usePermisos } from '@hce/api-client/react';
import { PERMISO_LABEL, tienePermiso, type Permiso } from '@hce/domain';
import { AccessDenied } from '@hce/ui';

export function RequirePermiso({ permiso, children }: { permiso: Permiso; children: ReactNode }) {
  const permisos = usePermisos();
  if (permisos === undefined) return null;
  if (!tienePermiso(permisos, permiso)) {
    return (
      <AccessDenied
        permiso={PERMISO_LABEL[permiso]}
        action={
          <a
            href="/"
            className="mt-2 inline-flex h-11 items-center rounded-md border border-line-strong px-4 font-semibold text-ink hover:border-brand-600"
          >
            Volver al inicio
          </a>
        }
      />
    );
  }
  return <>{children}</>;
}
