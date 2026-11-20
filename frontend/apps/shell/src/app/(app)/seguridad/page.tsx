'use client';

import { RequirePermiso } from '@hce/features';
import { PageHeader } from '@hce/ui';
import { UsuariosView } from '@/features/seguridad/UsuariosView';

export default function SeguridadPage() {
  return (
    <RequirePermiso permiso="seguridad.administrar">
      <PageHeader
        title="Usuarios y permisos"
        description="Cada usuario hereda los permisos de su rol. Aquí puedes otorgar o denegar permisos puntuales, con motivo y vigencia."
      />
      <UsuariosView />
    </RequirePermiso>
  );
}
