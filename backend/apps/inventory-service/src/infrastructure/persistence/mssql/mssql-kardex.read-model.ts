import { Injectable } from '@nestjs/common';
import { MssqlExecutor } from '@hce/common';
import { KardexItemDto, MovimientoDto } from '@hce/contracts';
import * as sql from 'mssql';
import { KardexReadModel } from '../../../domain/kardex/kardex.read-model.port';
import { Pagina, Paginacion } from '../../../domain/shared/audit-context';
import { KardexRow, MovimientoRow, toKardexItem, toMovimiento, totalFrom } from './row-mappers';

@Injectable()
export class MssqlKardexReadModel implements KardexReadModel {
  constructor(private readonly db: MssqlExecutor) {}

  async listar(search: string | undefined, paginacion: Paginacion): Promise<Pagina<KardexItemDto>> {
    const result = await this.db.execute('dbo.usp_Kardex_Listar', (r) => {
      r.input('Search', sql.NVarChar(100), search ?? null);
      r.input('Page', sql.Int, paginacion.page);
      r.input('PageSize', sql.Int, paginacion.pageSize);
    });
    const [total, rows] = result.recordsets as unknown as [{ Total: number }[], KardexRow[]];
    return { items: rows.map(toKardexItem), total: totalFrom(total), ...paginacion };
  }

  async movimientos(
    productoId: number,
    paginacion: Paginacion,
  ): Promise<{ producto: KardexItemDto; pagina: Pagina<MovimientoDto> } | null> {
    const result = await this.db.execute('dbo.usp_Kardex_Movimientos', (r) => {
      r.input('Id_producto', sql.Int, productoId);
      r.input('Page', sql.Int, paginacion.page);
      r.input('PageSize', sql.Int, paginacion.pageSize);
    });
    const [producto, total, rows] = result.recordsets as unknown as [KardexRow[], { Total: number }[], MovimientoRow[]];
    if (!producto[0]) return null;
    return {
      producto: toKardexItem(producto[0]),
      pagina: { items: rows.map(toMovimiento), total: totalFrom(total), ...paginacion },
    };
  }
}
