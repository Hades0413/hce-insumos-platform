'use client';

import { useState } from 'react';
import type { TipoExcepcion } from '@hce/api-client';
import { PERMISO_LABEL, ROL_LABEL, type Permiso } from '@hce/domain';
import { errorMessage } from '@hce/features';
import { Alert, Badge, ConfirmDialog, Drawer, SkeletonTable } from '@hce/ui';
import { useCambiarExcepcion, useCatalogoPermisos, usePermisosUsuario } from './hooks';
import { agruparPorModulo, estadoPermiso } from './model';
import { PermisoFila } from './PermisoFila';

interface DenegacionPendiente {
  codigo: string;
  descripcion: string;
  values: { motivo: string; vigenteHasta?: string };
}

export function PermisosDrawer({ usuarioId, onClose }: { usuarioId: string | null; onClose: () => void }) {
  const catalogo = useCatalogoPermisos();
  const { data, isPending, error } = usePermisosUsuario(usuarioId);
  const cambiar = useCambiarExcepcion(usuarioId ?? '');
  const [denegar, setDenegar] = useState<DenegacionPendiente | null>(null);

  const guardar = (
    codigo: string,
    descripcion: string,
    tipo: TipoExcepcion,
    values: { motivo: string; vigenteHasta?: string },
  ) => {
    if (tipo === 'DENY') return setDenegar({ codigo, descripcion, values });
    cambiar.mutate({ codigo, accion: 'guardar', tipo, ...values });
  };

  return (
    <>
      <Drawer
        open={usuarioId !== null}
        onClose={onClose}
        title={data?.usuario.nombreCompleto ?? 'Permisos del usuario'}
        description={
          data && (
            <span className="flex flex-wrap items-center gap-2">
              {data.usuario.email}
              <Badge tone="brand">{ROL_LABEL[data.usuario.rol]}</Badge>
            </span>
          )
        }
      >
        {isPending && <SkeletonTable columns={2} rows={8} />}
        {error && <Alert title="No se pudieron cargar los permisos">{errorMessage(error)}</Alert>}
        {data && (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted">
              Las excepciones se suman o restan a los permisos del rol; una denegación siempre prevalece. Cada cambio
              queda auditado con su motivo y se aplica en la siguiente acción del usuario.
            </p>
            {agruparPorModulo(catalogo).map(([modulo, permisos]) => (
              <section key={modulo} aria-labelledby={`modulo-${modulo}`}>
                <h3 id={`modulo-${modulo}`} className="border-b border-line-strong pb-1.5 text-base font-bold text-ink">
                  {modulo}
                </h3>
                <ul className="divide-y divide-line">
                  {permisos.map((p) => {
                    const descripcion = PERMISO_LABEL[p.codigo as Permiso] ?? p.descripcion;
                    return (
                      <PermisoFila
                        key={p.codigo}
                        fila={estadoPermiso(data, p.codigo)}
                        descripcion={descripcion}
                        ocupado={cambiar.isPending}
                        onGuardar={(tipo, values) => guardar(p.codigo, descripcion, tipo, values)}
                        onQuitar={() => cambiar.mutate({ codigo: p.codigo, accion: 'quitar' })}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        open={denegar !== null}
        title="¿Denegar este permiso?"
        confirmLabel="Denegar permiso"
        onCancel={() => setDenegar(null)}
        onConfirm={() => {
          if (denegar)
            cambiar.mutate({
              codigo: denegar.codigo,
              accion: 'guardar',
              tipo: 'DENY',
              ...denegar.values,
            });
          setDenegar(null);
        }}
      >
        <p>
          {data?.usuario.nombreCompleto} dejará de poder «{denegar?.descripcion.toLowerCase()}», aunque su rol lo
          incluya.
        </p>
        <p className="mt-2 text-muted">Motivo: «{denegar?.values.motivo}»</p>
      </ConfirmDialog>
    </>
  );
}
