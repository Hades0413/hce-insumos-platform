import type { ExcepcionDto, PermisosUsuarioDto, TipoExcepcion } from '@hce/api-client';
import { z } from 'zod';

z.config({ jitless: true });

export type EstadoPermiso = 'rol' | 'otorgado' | 'denegado' | 'sin-acceso';

export interface FilaPermiso {
  codigo: string;
  estado: EstadoPermiso;
  efectivo: boolean;
  excepcion?: ExcepcionDto;
}

export function estadoPermiso(dto: PermisosUsuarioDto, codigo: string): FilaPermiso {
  const excepcion = dto.excepciones.find((e) => e.permiso === codigo);
  const efectivo = dto.efectivos.includes(codigo);
  if (excepcion?.tipo === 'DENY') return { codigo, estado: 'denegado', efectivo, excepcion };
  if (excepcion?.tipo === 'GRANT') return { codigo, estado: 'otorgado', efectivo, excepcion };
  return {
    codigo,
    estado: dto.permisosRol.includes(codigo) ? 'rol' : 'sin-acceso',
    efectivo,
  };
}

export function aplicarExcepcion(
  dto: PermisosUsuarioDto,
  codigo: string,
  cambio: {
    tipo: TipoExcepcion;
    motivo: string;
    vigenteHasta: string | null;
    otorgadoPor: string;
  } | null,
): PermisosUsuarioDto {
  const excepciones = dto.excepciones.filter((e) => e.permiso !== codigo);
  if (cambio)
    excepciones.push({
      permiso: codigo,
      ...cambio,
      fecRegistro: new Date().toISOString(),
    });
  const porRol = dto.permisosRol.includes(codigo);
  const efectivo = cambio ? cambio.tipo === 'GRANT' : porRol;
  const efectivos = dto.efectivos.filter((p) => p !== codigo);
  if (efectivo) efectivos.push(codigo);
  return { ...dto, excepciones, efectivos };
}

export const excepcionSchema = z.object({
  motivo: z.string().trim().min(10, 'Explica el motivo (mínimo 10 caracteres)').max(300, 'Máximo 300 caracteres'),
  vigenteHasta: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), 'La vigencia debe ser una fecha futura'),
});

export type ExcepcionFormValues = z.infer<typeof excepcionSchema>;

export function agruparPorModulo<T extends { modulo: string }>(items: ReadonlyArray<T>): [string, T[]][] {
  const grupos = new Map<string, T[]>();
  for (const item of items) grupos.set(item.modulo, [...(grupos.get(item.modulo) ?? []), item]);
  return [...grupos.entries()];
}
