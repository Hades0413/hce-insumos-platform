export const PERMISOS = [
  'productos.ver',
  'productos.registrar',
  'productos.editar',
  'productos.eliminar',
  'productos.precio_manual',
  'compras.ver',
  'compras.registrar',
  'ventas.ver',
  'ventas.registrar',
  'kardex.ver',
  'seguridad.administrar',
] as const;
export type Permiso = (typeof PERMISOS)[number];

const PERMISOS_SET: ReadonlySet<string> = new Set(PERMISOS);

export function esPermiso(value: unknown): value is Permiso {
  return typeof value === 'string' && PERMISOS_SET.has(value);
}

export function sanearPermisos(values: unknown): Permiso[] {
  return Array.isArray(values) ? [...new Set(values.filter(esPermiso))].sort() : [];
}

export function tienePermiso(permisos: readonly string[] | undefined, requerido: Permiso): boolean {
  return Array.isArray(permisos) && permisos.includes(requerido);
}

export type TipoExcepcion = 'GRANT' | 'DENY';

export interface PermisoCatalogoDto {
  codigo: Permiso;
  modulo: string;
  descripcion: string;
}

export interface RolDto {
  codigo: string;
  nombre: string;
  permisos: Permiso[];
}

export interface UsuarioAdminDto {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: string;
  activo: boolean;
  excepciones: number;
}

export interface ExcepcionPermisoDto {
  permiso: Permiso;
  tipo: TipoExcepcion;
  motivo: string;
  vigenteHasta: string | null;
  otorgadoPor: string;
  fecRegistro: string;
}

export interface UsuarioPermisosDto {
  usuario: { id: string; email: string; nombreCompleto: string; rol: string };
  permisosRol: Permiso[];
  excepciones: ExcepcionPermisoDto[];
  efectivos: Permiso[];
}

export interface GuardarExcepcionRequest {
  usuarioId: string;
  permiso: Permiso;
  tipo: TipoExcepcion;
  motivo: string;
  vigenteHasta?: string | null;
}

export interface EliminarExcepcionRequest {
  usuarioId: string;
  permiso: Permiso;
}

export interface UsuarioIdRequest {
  usuarioId: string;
}

export interface PermissionsChangedEvent {
  userId: string;
  changedAt: number;
}
