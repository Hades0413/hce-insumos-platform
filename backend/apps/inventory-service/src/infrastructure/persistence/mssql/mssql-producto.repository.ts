import { Injectable } from '@nestjs/common';
import { MssqlExecutor } from '@hce/common';
import * as sql from 'mssql';
import { DatosProducto, Producto } from '../../../domain/producto/producto';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { AuditContext, Pagina, Paginacion } from '../../../domain/shared/audit-context';
import { ProductoRow, toProducto, totalFrom } from './row-mappers';

/** Adaptador de salida: implementa el puerto ProductoRepository con SP de SQL Server. */
@Injectable()
export class MssqlProductoRepository implements ProductoRepository {
  constructor(private readonly db: MssqlExecutor) {}

  async crear(datos: DatosProducto, ctx: AuditContext): Promise<Producto> {
    const result = await this.db.execute<ProductoRow>('dbo.usp_Producto_Insertar', (r) => {
      bindDatos(r, datos);
      bindContext(r, ctx);
    });
    return toProducto(result.recordset[0]);
  }

  async actualizar(id: number, datos: DatosProducto, rowVersion: string, ctx: AuditContext): Promise<Producto> {
    const result = await this.db.execute<ProductoRow>('dbo.usp_Producto_Actualizar', (r) => {
      r.input('Id_producto', sql.Int, id);
      bindDatos(r, datos);
      r.input('RowVersion', sql.VarBinary(8), Buffer.from(rowVersion, 'base64'));
      bindContext(r, ctx);
    });
    return toProducto(result.recordset[0]);
  }

  async eliminar(id: number, ctx: AuditContext): Promise<void> {
    await this.db.execute('dbo.usp_Producto_Eliminar', (r) => {
      r.input('Id_producto', sql.Int, id);
      bindContext(r, ctx);
    });
  }

  async obtenerPorId(id: number): Promise<Producto | null> {
    const result = await this.db.execute<ProductoRow>('dbo.usp_Producto_ObtenerPorId', (r) =>
      r.input('Id_producto', sql.Int, id),
    );
    const row = result.recordset[0];
    return row ? toProducto(row) : null;
  }

  async obtenerPorIds(ids: readonly number[]): Promise<Producto[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    const tvp = new sql.Table('dbo.tt_Ids');
    tvp.columns.add('Id', sql.Int, { nullable: false });
    unique.forEach((id) => tvp.rows.add(id));
    const result = await this.db.execute<ProductoRow>('dbo.usp_Producto_ObtenerPorIds', (r) => r.input('Ids', tvp));
    return result.recordset.map(toProducto);
  }

  async listar(search: string | undefined, paginacion: Paginacion): Promise<Pagina<Producto>> {
    const result = await this.db.execute('dbo.usp_Producto_Listar', (r) => {
      r.input('Search', sql.NVarChar(100), search ?? null);
      r.input('Page', sql.Int, paginacion.page);
      r.input('PageSize', sql.Int, paginacion.pageSize);
    });
    const sets = result.recordsets as unknown as [{ Total: number }[], ProductoRow[]];
    return { items: sets[1].map(toProducto), total: totalFrom(sets[0]), ...paginacion };
  }
}

function bindDatos(r: sql.Request, datos: DatosProducto): void {
  r.input('Nombre', sql.NVarChar(150), datos.nombre);
  r.input('NroLote', sql.VarChar(50), datos.nroLote);
  r.input('Costo', sql.Decimal(18, 2), datos.costo.toDecimal());
  r.input('PrecioVenta', sql.Decimal(18, 2), datos.precioVenta.toDecimal());
}

export function bindContext(r: sql.Request, ctx: AuditContext): void {
  r.input('UsuarioId', sql.NVarChar(64), ctx.userId);
  r.input('RequestId', sql.NVarChar(64), ctx.requestId.slice(0, 64));
}
