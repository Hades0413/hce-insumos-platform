import { KardexItemDto, MovimientoDto } from '@hce/contracts';
import { Pagina, Paginacion } from '../shared/audit-context';

export const KARDEX_READ_MODEL = Symbol('KARDEX_READ_MODEL');

/** Read model (CQRS-lite): consultas optimizadas que no necesitan el modelo de dominio. */
export interface KardexReadModel {
  listar(search: string | undefined, paginacion: Paginacion): Promise<Pagina<KardexItemDto>>;
  movimientos(
    productoId: number,
    paginacion: Paginacion,
  ): Promise<{ producto: KardexItemDto; pagina: Pagina<MovimientoDto> } | null>;
}
