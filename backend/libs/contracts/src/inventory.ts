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

export interface SearchQuery extends PageQuery {
  search?: string;
}

export interface RangoFechasQuery extends PageQuery {
  desde?: string;
  hasta?: string;
}

/* ------------------------------------------------------------ Productos */
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

export interface CrearProductoRequest {
  nombre: string;
  nroLote: string;
  costo?: number;
}

export interface ActualizarProductoRequest {
  id: number;
  nombre: string;
  nroLote: string;
  costo: number;
  precioVenta?: number;
  rowVersion: string;
}

export interface IdRequest {
  id: number;
}

/* ------------------------------------------------------------ Documentos */
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

export interface DocumentoDetalleDto extends DocumentoResumenDto {
  detalles: DocumentoLineaDto[];
}

export type CompraDetalleDto = DocumentoDetalleDto;
export type VentaDetalleDto = DocumentoDetalleDto;

export interface RegistrarCompraRequest {
  idempotencyKey: string;
  items: { productoId: number; cantidad: number; costoUnitario: number }[];
}

export interface RegistrarVentaRequest {
  idempotencyKey: string;
  items: { productoId: number; cantidad: number }[];
}

/* ------------------------------------------------------------ Kardex */
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

export interface KardexMovimientosRequest extends PageQuery {
  productoId: number;
}

export interface KardexMovimientosDto extends Paginated<MovimientoDto> {
  producto: KardexItemDto;
}

export interface HealthDto {
  status: 'up' | 'down';
  database: 'up' | 'down';
}
