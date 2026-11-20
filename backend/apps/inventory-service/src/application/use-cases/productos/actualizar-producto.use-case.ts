import { AppError } from '@hce/core';
import { ActualizarProductoRequest, ErrorCode, ProductoDto, RequestContext, tienePermiso } from '@hce/contracts';
import { Producto } from '../../../domain/producto/producto';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { validarId } from '../../../domain/shared/cantidad';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { UseCase } from '@hce/core';
import { toProductoDto } from '../../presenters';

const ROW_VERSION_REGEX = /^[A-Za-z0-9+/]{11}=$/;

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
    if (input.precioVenta !== undefined && input.precioVenta !== null) {
      if (!tienePermiso(ctx.permisos, 'productos.precio_manual')) {
        throw new AppError(ErrorCode.FORBIDDEN, 'No tiene permiso para fijar manualmente el precio de venta.');
      }
      if (datos.precioVenta.cents < datos.costo.cents) {
        throw AppError.validation('El precio de venta no puede ser menor que el costo.', [
          { field: 'precioVenta', message: 'Debe ser mayor o igual al costo' },
        ]);
      }
    }
    const actualizado = await this.productos.actualizar(id, datos, input.rowVersion, ctx);
    return toProductoDto(actualizado);
  }
}
