import { AppError } from '@hce/common';
import { ActualizarProductoRequest, ProductoDto, RequestContext } from '@hce/contracts';
import { Producto } from '../../../domain/producto/producto';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { validarId } from '../../../domain/shared/cantidad';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { UseCase } from '../../ports/use-case';
import { toProductoDto } from '../../presenters';

const ROW_VERSION_REGEX = /^[A-Za-z0-9+/]{11}=$/; // 8 bytes en base64

export class ActualizarProductoUseCase implements UseCase<ActualizarProductoRequest, ProductoDto> {
  constructor(
    private readonly productos: ProductoRepository,
    private readonly politica: PoliticaPrecios,
  ) {}

  async execute(input: ActualizarProductoRequest, ctx: RequestContext): Promise<ProductoDto> {
    const id = validarId(input.id, 'id');
    if (typeof input.rowVersion !== 'string' || !ROW_VERSION_REGEX.test(input.rowVersion)) {
      throw AppError.validation('rowVersion inválido.', [{ field: 'rowVersion', message: 'Base64 de 8 bytes' }]);
    }
    const datos = Producto.preparar(input, this.politica);
    const actualizado = await this.productos.actualizar(id, datos, input.rowVersion, ctx);
    return toProductoDto(actualizado);
  }
}
