import { AppError } from '@hce/common';
import { KardexMovimientosDto, KardexMovimientosRequest } from '@hce/contracts';
import { KardexReadModel } from '../../../domain/kardex/kardex.read-model.port';
import { normalizarPaginacion } from '../../../domain/shared/audit-context';
import { validarId } from '../../../domain/shared/cantidad';
import { UseCase } from '../../ports/use-case';

export class ListarMovimientosUseCase implements UseCase<KardexMovimientosRequest, KardexMovimientosDto> {
  constructor(private readonly kardex: KardexReadModel) {}

  async execute(input: KardexMovimientosRequest): Promise<KardexMovimientosDto> {
    const resultado = await this.kardex.movimientos(
      validarId(input.productoId, 'productoId'),
      normalizarPaginacion(input.page, input.pageSize),
    );
    if (!resultado) throw AppError.notFound('El producto no existe.');
    return { producto: resultado.producto, ...resultado.pagina };
  }
}
