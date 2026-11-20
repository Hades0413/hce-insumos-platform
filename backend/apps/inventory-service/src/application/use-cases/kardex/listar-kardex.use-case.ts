import { KardexItemDto, Paginated, SearchQuery } from '@hce/contracts';
import { KardexReadModel } from '../../../domain/kardex/kardex.read-model.port';
import { normalizarPaginacion } from '../../../domain/shared/audit-context';
import { UseCase } from '@hce/core';

export class ListarKardexUseCase implements UseCase<SearchQuery, Paginated<KardexItemDto>> {
  constructor(private readonly kardex: KardexReadModel) {}

  execute(input: SearchQuery): Promise<Paginated<KardexItemDto>> {
    return this.kardex.listar(input.search?.slice(0, 100), normalizarPaginacion(input.page, input.pageSize));
  }
}
