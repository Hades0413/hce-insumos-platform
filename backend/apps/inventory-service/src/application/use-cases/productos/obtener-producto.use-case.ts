import { AppError } from '@hce/core';
import { IdRequest, ProductoDto } from '@hce/contracts';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { validarId } from '../../../domain/shared/cantidad';
import { UseCase } from '@hce/core';
import { toProductoDto } from '../../presenters';

export class ObtenerProductoUseCase implements UseCase<IdRequest, ProductoDto> {
  constructor(private readonly productos: ProductoRepository) {}

  async execute(input: IdRequest): Promise<ProductoDto> {
    const producto = await this.productos.obtenerPorId(validarId(input.id, 'id'));
    if (!producto) throw AppError.notFound('El producto no existe.');
    return toProductoDto(producto);
  }
}
