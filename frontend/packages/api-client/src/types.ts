import type { Permiso, Rol } from '@hce/domain';

export type { Permiso, Rol };

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface UserDto {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  permisos?: Permiso[];
}

export interface SessionDto {
  user: UserDto;
  accessTokenExpiresAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ProductoDto {
  id: number;
  nombre: string;
  nroLote: string;
  fecRegistro: string;
  costo: number;
  precioVenta: number;
  stock: number;
  rowVersion: string;
}

export interface CrearProductoDto {
  nombre: string;
  nroLote: string;
  costo?: number;
}

export interface ActualizarProductoDto {
  nombre: string;
  nroLote: string;
  costo: number;
  precioVenta?: number;
  rowVersion: string;
}

export interface RegistrarCompraDto {
  items: { productoId: number; cantidad: number; costoUnitario: number }[];
}

export interface RegistrarVentaDto {
  items: { productoId: number; cantidad: number }[];
}

export interface DocumentoResumenDto {
  id: number;
  fecRegistro: string;
  subTotal: number;
  igv: number;
  total: number;
  cantidadItems: number;
}

export interface DocumentoLineaDto {
  id: number;
  productoId: number;
  productoNombre: string;
  nroLote: string;
  cantidad: number;
  precio: number;
  subTotal: number;
  igv: number;
  total: number;
}

export interface CompraDetalleDto extends DocumentoResumenDto {
  detalles: DocumentoLineaDto[];
}

export type VentaDetalleDto = CompraDetalleDto;

export interface DocumentoQuery extends PageQuery {
  desde?: string;
  hasta?: string;
}

export interface SearchQuery extends PageQuery {
  search?: string;
}

export interface KardexItemDto {
  productoId: number;
  nombreProducto: string;
  nroLote: string;
  stockActual: number;
  costo: number;
  precioVenta: number;
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA';

export interface MovimientoDto {
  movimientoId: number;
  fecRegistro: string;
  tipoMovimiento: TipoMovimiento;
  idTipoMovimiento: 1 | 2;
  documentoOrigenId: number;
  cantidad: number;
  saldo: number;
}

export interface KardexMovimientosDto extends Paginated<MovimientoDto> {
  producto: KardexItemDto;
}

export interface HealthDto {
  status: 'ok' | 'error';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export type TipoExcepcion = 'GRANT' | 'DENY';

export interface PermisoCatalogoDto {
  codigo: string;
  descripcion: string;
  modulo: string;
}

export interface RolDto {
  codigo: Rol;
  nombre: string;
  permisos: string[];
}

export interface UsuarioAdminDto {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  activo: boolean;
  excepciones: number;
}

export interface ExcepcionDto {
  permiso: string;
  tipo: TipoExcepcion;
  motivo: string;
  vigenteHasta: string | null;
  otorgadoPor: string;
  fecRegistro: string;
}

export interface PermisosUsuarioDto {
  usuario: Pick<UsuarioAdminDto, 'id' | 'email' | 'nombreCompleto' | 'rol'>;
  permisosRol: string[];
  excepciones: ExcepcionDto[];
  efectivos: string[];
}

export interface GuardarExcepcionDto {
  tipo: TipoExcepcion;
  motivo: string;
  vigenteHasta?: string;
}
