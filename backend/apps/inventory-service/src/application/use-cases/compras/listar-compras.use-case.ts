import { DocumentoResumenDto, Paginated, RangoFechasQuery } from '@hce/contracts';
import { CompraRepository } from '../../../domain/compra/compra.repository.port';
import { normalizarPaginacion } from '../../../domain/shared/audit-context';
import { UseCase } from '@hce/core';
import { validarRango } from '../rango-fechas';

export class ListarComprasUseCase implements UseCase<RangoFechasQuery, Paginated<DocumentoResumenDto>> {
  constructor(private readonly compras: CompraRepository) {}

  execute(input: RangoFechasQuery): Promise<Paginated<DocumentoResumenDto>> {
    return this.compras.listar(
      validarRango(input.desde, input.hasta),
      normalizarPaginacion(input.page, input.pageSize),
    );
  }
}
