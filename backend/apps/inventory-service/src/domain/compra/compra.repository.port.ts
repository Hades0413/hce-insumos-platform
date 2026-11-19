import { CompraDetalleDto, DocumentoResumenDto } from '@hce/contracts';
import { AuditContext, Pagina, Paginacion } from '../shared/audit-context';
import { Compra } from './compra';

export const COMPRA_REPOSITORY = Symbol('COMPRA_REPOSITORY');

export interface MetadatosIdempotencia {
  readonly idempotencyKey: string;
  readonly requestHash: Buffer;
}

export type ResultadoRegistroCompra = { readonly tipo: 'REGISTRADA' | 'IDEMPOTENTE'; readonly id: number };

export interface RangoFechas {
  readonly desde?: string;
  readonly hasta?: string;
}

export interface CompraRepository {
  registrar(compra: Compra, meta: MetadatosIdempotencia, ctx: AuditContext): Promise<ResultadoRegistroCompra>;
  obtener(id: number): Promise<CompraDetalleDto | null>;
  listar(rango: RangoFechas, paginacion: Paginacion): Promise<Pagina<DocumentoResumenDto>>;
}
