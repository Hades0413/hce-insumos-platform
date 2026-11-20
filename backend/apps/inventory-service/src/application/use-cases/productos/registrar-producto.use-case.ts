import { CrearProductoRequest, ProductoDto, RequestContext } from '@hce/contracts';
import { Producto } from '../../../domain/producto/producto';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { UseCase } from '@hce/core';
import { toProductoDto } from '../../presenters';

export class RegistrarProductoUseCase implements UseCase<CrearProductoRequest, ProductoDto> {
  constructor(
    private readonly productos: ProductoRepository,
    private readonly politica: PoliticaPrecios,
  ) {}

  async execute(input: CrearProductoRequest, ctx: RequestContext): Promise<ProductoDto> {
    const datos = Producto.preparar(
      { nombre: input.nombre, nroLote: input.nroLote, costo: input.costo },
      this.politica,
    );
    const creado = await this.productos.crear(datos, ctx);
    return toProductoDto(creado);
  }
}
