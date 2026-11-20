import { IdRequest, RequestContext } from '@hce/contracts';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { validarId } from '../../../domain/shared/cantidad';
import { UseCase } from '@hce/core';

export class EliminarProductoUseCase implements UseCase<IdRequest, void> {
  constructor(private readonly productos: ProductoRepository) {}

  async execute(input: IdRequest, ctx: RequestContext): Promise<void> {
    await this.productos.eliminar(validarId(input.id, 'id'), ctx);
  }
}
