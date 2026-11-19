import {
  DocumentoDetalleDto,
  DocumentoLineaDto,
  DocumentoResumenDto,
  KardexItemDto,
  MovimientoDto,
} from '@hce/contracts';
import { Producto } from '../../../domain/producto/producto';
import { Money } from '../../../domain/shared/money';

/** Conversión explícita fila SQL -> modelo (nunca se exponen filas crudas). */
export const dec = (value: unknown): number => Math.round(Number(value) * 100) / 100;
const iso = (value: unknown): string => (value instanceof Date ? value : new Date(String(value))).toISOString();

export interface ProductoRow {
  Id_producto: number;
  Nombre_producto: string;
  NroLote: string;
  Fec_registro: Date;
  Costo: number;
  PrecioVenta: number;
  Stock: number;
  RowVersion: Buffer;
}

export function toProducto(row: ProductoRow): Producto {
  return Producto.rehidratar({
    id: row.Id_producto,
    nombre: row.Nombre_producto,
    nroLote: row.NroLote,
    fecRegistro: row.Fec_registro,
    costo: Money.fromDecimal(dec(row.Costo)),
    precioVenta: Money.fromDecimal(dec(row.PrecioVenta)),
    stock: Number(row.Stock),
    rowVersion: Buffer.from(row.RowVersion).toString('base64'),
  });
}

export interface DocumentoResumenRow {
  Id: number;
  FecRegistro: Date;
  SubTotal: number;
  Igv: number;
  Total: number;
  CantidadItems: number;
}

export function toDocumentoResumen(row: DocumentoResumenRow): DocumentoResumenDto {
  return {
    id: row.Id,
    fecRegistro: iso(row.FecRegistro),
    subTotal: dec(row.SubTotal),
    igv: dec(row.Igv),
    total: dec(row.Total),
    cantidadItems: Number(row.CantidadItems),
  };
}

export interface DocumentoLineaRow {
  Id: number;
  Id_producto: number;
  Nombre_producto: string;
  NroLote: string;
  Cantidad: number;
  Precio: number;
  Sub_Total: number;
  Igv: number;
  Total: number;
}

export function toDocumentoLinea(row: DocumentoLineaRow): DocumentoLineaDto {
  return {
    id: row.Id,
    productoId: row.Id_producto,
    productoNombre: row.Nombre_producto,
    nroLote: row.NroLote,
    cantidad: row.Cantidad,
    precio: dec(row.Precio),
    subTotal: dec(row.Sub_Total),
    igv: dec(row.Igv),
    total: dec(row.Total),
  };
}

export function toDocumentoDetalle(cab: DocumentoResumenRow, lineas: DocumentoLineaRow[]): DocumentoDetalleDto {
  return { ...toDocumentoResumen(cab), detalles: lineas.map(toDocumentoLinea) };
}

export interface KardexRow {
  Id_producto: number;
  Nombre_producto: string;
  NroLote: string;
  Stock_actual: number;
  Costo: number;
  PrecioVenta: number;
}

export function toKardexItem(row: KardexRow): KardexItemDto {
  return {
    productoId: row.Id_producto,
    nombreProducto: row.Nombre_producto,
    nroLote: row.NroLote,
    stockActual: Number(row.Stock_actual),
    costo: dec(row.Costo),
    precioVenta: dec(row.PrecioVenta),
  };
}

export interface MovimientoRow {
  Id_MovimientoCab: number;
  Fec_registro: Date;
  Id_TipoMovimiento: number;
  TipoMovimiento: string;
  Id_DocumentoOrigen: number;
  Cantidad: number;
  Saldo: number;
}

export function toMovimiento(row: MovimientoRow): MovimientoDto {
  const entrada = row.Id_TipoMovimiento === 1;
  return {
    movimientoId: row.Id_MovimientoCab,
    fecRegistro: iso(row.Fec_registro),
    tipoMovimiento: entrada ? 'ENTRADA' : 'SALIDA',
    idTipoMovimiento: entrada ? 1 : 2,
    documentoOrigenId: row.Id_DocumentoOrigen,
    cantidad: row.Cantidad,
    saldo: Number(row.Saldo),
  };
}

export function totalFrom(recordset: { Total: number | string }[] | undefined): number {
  return Number(recordset?.[0]?.Total ?? 0);
}
