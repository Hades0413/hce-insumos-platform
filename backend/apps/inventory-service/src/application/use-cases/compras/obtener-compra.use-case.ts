import { AppError } from '@hce/common';
import { CompraDetalleDto, IdRequest } from '@hce/contracts';
import { CompraRepository } from '../../../domain/compra/compra.repository.port';
import { validarId } from '../../../domain/shared/cantidad';
import { UseCase } from '../../ports/use-case';

export class ObtenerCompraUseCase implements UseCase<IdRequest, CompraDetalleDto> {
  constructor(private readonly compras: CompraRepository) {}

  async execute(input: IdRequest): Promise<CompraDetalleDto> {
    const compra = await this.compras.obtener(validarId(input.id, 'id'));
    if (!compra) throw AppError.notFound('La compra no existe.');
    return compra;
  }
}
