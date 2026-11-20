'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type PermisoCatalogoDto, type PermisosUsuarioDto, type TipoExcepcion } from '@hce/api-client';
import { queryKeys, useSession } from '@hce/api-client/react';
import { PERMISO_LABEL, PERMISOS } from '@hce/domain';
import { errorMessage } from '@hce/features';
import { useToast } from '@hce/ui';
import { aplicarExcepcion } from './model';

const MODULO_LABEL: Record<string, string> = {
  productos: 'Productos',
  compras: 'Compras',
  ventas: 'Ventas',
  kardex: 'Kardex',
  seguridad: 'Seguridad',
};

const CATALOGO_LOCAL: PermisoCatalogoDto[] = PERMISOS.map((codigo) => {
  const modulo = codigo.split('.')[0]!;
  return {
    codigo,
    descripcion: PERMISO_LABEL[codigo],
    modulo: MODULO_LABEL[modulo] ?? modulo,
  };
});

export function moduloLabel(modulo: string): string {
  return MODULO_LABEL[modulo.toLowerCase()] ?? modulo.charAt(0).toUpperCase() + modulo.slice(1);
}

export function useCatalogoPermisos(): PermisoCatalogoDto[] {
  const { data } = useQuery({
    queryKey: queryKeys.admin.catalogo,
    queryFn: () => api.admin.permisos(),
    staleTime: 10 * 60_000,
  });
  return data && data.length > 0 ? data.map((p) => ({ ...p, modulo: moduloLabel(p.modulo) })) : CATALOGO_LOCAL;
}

export function usePermisosUsuario(usuarioId: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.permisosUsuario(usuarioId ?? 'none'),
    queryFn: () => api.admin.permisosUsuario(usuarioId!),
    enabled: usuarioId !== null,
  });
}

export type CambioExcepcion =
  | {
      codigo: string;
      accion: 'guardar';
      tipo: TipoExcepcion;
      motivo: string;
      vigenteHasta?: string;
    }
  | { codigo: string; accion: 'quitar' };

export function useCambiarExcepcion(usuarioId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: session } = useSession();
  const key = queryKeys.admin.permisosUsuario(usuarioId);

  return useMutation<PermisosUsuarioDto, ApiError, CambioExcepcion, { previo?: PermisosUsuarioDto }>({
    mutationFn: (c) =>
      (c.accion === 'quitar'
        ? api.admin.quitarExcepcion(usuarioId, c.codigo)
        : api.admin.guardarExcepcion(usuarioId, c.codigo, {
            tipo: c.tipo,
            motivo: c.motivo,
            vigenteHasta: c.vigenteHasta,
          })
      ).catch((e: unknown) => Promise.reject(ApiError.from(e))),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: key });
      const previo = qc.getQueryData<PermisosUsuarioDto>(key);
      if (previo) {
        qc.setQueryData(
          key,
          aplicarExcepcion(
            previo,
            c.codigo,
            c.accion === 'quitar'
              ? null
              : {
                  tipo: c.tipo,
                  motivo: c.motivo,
                  vigenteHasta: c.vigenteHasta ?? null,
                  otorgadoPor: session?.user.nombreCompleto ?? '',
                },
          ),
        );
      }
      return { previo };
    },
    onError: (e, _c, ctx) => {
      if (ctx?.previo) qc.setQueryData(key, ctx.previo);
      toast.error('El cambio no se aplicó', errorMessage(e));
    },
    onSuccess: (dto, c) => {
      qc.setQueryData(key, dto);
      const label = PERMISO_LABEL[c.codigo as keyof typeof PERMISO_LABEL] ?? c.codigo;
      toast.success(
        c.accion === 'quitar' ? 'Excepción quitada' : c.tipo === 'GRANT' ? 'Permiso otorgado' : 'Permiso denegado',
        `${label} para ${dto.usuario.nombreCompleto}. Se aplica en su próxima acción.`,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  });
}
