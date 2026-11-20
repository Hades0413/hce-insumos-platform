import { Paginated, ProductoDto, SearchQuery } from '@hce/contracts';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { normalizarPaginacion } from '../../../domain/shared/audit-context';
import { UseCase } from '@hce/core';
import { toProductoDto } from '../../presenters';

export class ListarProductosUseCase implements UseCase<SearchQuery, Paginated<ProductoDto>> {
  constructor(private readonly productos: ProductoRepository) {}

  async execute(input: SearchQuery): Promise<Paginated<ProductoDto>> {
    const pagina = await this.productos.listar(
      input.search?.slice(0, 100),
      normalizarPaginacion(input.page, input.pageSize),
    );
    return { ...pagina, items: pagina.items.map(toProductoDto) };
  }
}
