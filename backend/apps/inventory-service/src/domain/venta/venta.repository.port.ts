import { DocumentoResumenDto, VentaDetalleDto } from '@hce/contracts';
import { MetadatosIdempotencia, RangoFechas } from '../compra/compra.repository.port';
import { AuditContext, Pagina, Paginacion } from '../shared/audit-context';
import { ConflictoStock, Venta } from './venta';

export const VENTA_REPOSITORY = Symbol('VENTA_REPOSITORY');

export type ResultadoRegistroVenta =
  | { readonly tipo: 'REGISTRADA' | 'IDEMPOTENTE'; readonly id: number }
  | { readonly tipo: 'STOCK_INSUFICIENTE'; readonly conflictos: readonly ConflictoStock[] }
  | { readonly tipo: 'PRECIO_CAMBIADO' };

export interface VentaRepository {
  registrar(venta: Venta, meta: MetadatosIdempotencia, ctx: AuditContext): Promise<ResultadoRegistroVenta>;
  obtener(id: number): Promise<VentaDetalleDto | null>;
  listar(rango: RangoFechas, paginacion: Paginacion): Promise<Pagina<DocumentoResumenDto>>;
}
