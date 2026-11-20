import { DocumentoResumenDto, Paginated, RangoFechasQuery } from '@hce/contracts';
import { normalizarPaginacion } from '../../../domain/shared/audit-context';
import { VentaRepository } from '../../../domain/venta/venta.repository.port';
import { UseCase } from '@hce/core';
import { validarRango } from '../rango-fechas';

export class ListarVentasUseCase implements UseCase<RangoFechasQuery, Paginated<DocumentoResumenDto>> {
  constructor(private readonly ventas: VentaRepository) {}

  execute(input: RangoFechasQuery): Promise<Paginated<DocumentoResumenDto>> {
    return this.ventas.listar(validarRango(input.desde, input.hasta), normalizarPaginacion(input.page, input.pageSize));
  }
}
