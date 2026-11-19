import { Injectable } from '@nestjs/common';
import { MssqlExecutor } from '@hce/common';
import { DocumentoResumenDto, VentaDetalleDto } from '@hce/contracts';
import * as sql from 'mssql';
import { MetadatosIdempotencia, RangoFechas } from '../../../domain/compra/compra.repository.port';
import { AuditContext, Pagina, Paginacion } from '../../../domain/shared/audit-context';
import { Venta } from '../../../domain/venta/venta';
import { ResultadoRegistroVenta, VentaRepository } from '../../../domain/venta/venta.repository.port';
import { idempotencyConflict, registrarIdempotente } from './mssql-compra.repository';
import { bindContext } from './mssql-producto.repository';
import {
  DocumentoLineaRow,
  DocumentoResumenRow,
  toDocumentoDetalle,
  toDocumentoResumen,
  totalFrom,
} from './row-mappers';

interface ConflictoRow {
  Id_producto: number;
  StockDisponible: number;
  CantidadSolicitada: number;
}

@Injectable()
export class MssqlVentaRepository implements VentaRepository {
  constructor(private readonly db: MssqlExecutor) {}

  async registrar(venta: Venta, meta: MetadatosIdempotencia, ctx: AuditContext): Promise<ResultadoRegistroVenta> {
    const lineas = new sql.Table('dbo.tt_LineaVenta');
    lineas.columns.add('Id_producto', sql.Int, { nullable: false });
    lineas.columns.add('Cantidad', sql.Int, { nullable: false });
    lineas.columns.add('Precio', sql.Decimal(18, 2), { nullable: false });
    lineas.columns.add('Sub_Total', sql.Decimal(18, 2), { nullable: false });
    lineas.columns.add('Igv', sql.Decimal(18, 2), { nullable: false });
    lineas.columns.add('Total', sql.Decimal(18, 2), { nullable: false });
    for (const l of venta.lineas) {
      lineas.rows.add(
        l.productoId,
        l.cantidad,
        l.precio.toDecimal(),
        l.subTotal.toDecimal(),
        l.igv.toDecimal(),
        l.total.toDecimal(),
      );
    }

    const result = await registrarIdempotente(() =>
      this.db.execute<ConflictoRow>('dbo.usp_Venta_Registrar', (r) => {
        r.input('Lineas', lineas);
        r.input('SubTotal', sql.Decimal(18, 2), venta.totales.subTotal.toDecimal());
        r.input('Igv', sql.Decimal(18, 2), venta.totales.igv.toDecimal());
        r.input('Total', sql.Decimal(18, 2), venta.totales.total.toDecimal());
        r.input('IdempotencyKey', sql.UniqueIdentifier, meta.idempotencyKey);
        r.input('RequestHash', sql.VarBinary(32), meta.requestHash);
        bindContext(r, ctx);
        r.output('Id_VentaCab', sql.Int);
        r.output('Resultado', sql.VarChar(30));
      }),
    );

    const resultado = result.output.Resultado as string;
    const id = result.output.Id_VentaCab as number;
    switch (resultado) {
      case 'OK':
        return { tipo: 'REGISTRADA', id };
      case 'IDEMPOTENTE':
        return { tipo: 'IDEMPOTENTE', id };
      case 'PRECIO_CAMBIADO':
        return { tipo: 'PRECIO_CAMBIADO' };
      case 'STOCK_INSUFICIENTE':
        return {
          tipo: 'STOCK_INSUFICIENTE',
          conflictos: (result.recordset ?? []).map((c) => ({
            productoId: c.Id_producto,
            stockDisponible: Number(c.StockDisponible),
            cantidadSolicitada: Number(c.CantidadSolicitada),
          })),
        };
      case 'IDEMPOTENCY_CONFLICT':
        throw idempotencyConflict();
      default:
        throw new Error(`Resultado inesperado de usp_Venta_Registrar: ${resultado}`);
    }
  }

  async obtener(id: number): Promise<VentaDetalleDto | null> {
    const result = await this.db.execute('dbo.usp_Venta_Obtener', (r) => r.input('Id_VentaCab', sql.Int, id));
    const [cab, lineas] = result.recordsets as unknown as [DocumentoResumenRow[], DocumentoLineaRow[]];
    return cab[0] ? toDocumentoDetalle(cab[0], lineas) : null;
  }

  async listar(rango: RangoFechas, paginacion: Paginacion): Promise<Pagina<DocumentoResumenDto>> {
    const result = await this.db.execute('dbo.usp_Venta_Listar', (r) => {
      r.input('Desde', sql.Date, rango.desde ?? null);
      r.input('Hasta', sql.Date, rango.hasta ?? null);
      r.input('Page', sql.Int, paginacion.page);
      r.input('PageSize', sql.Int, paginacion.pageSize);
    });
    const [total, rows] = result.recordsets as unknown as [{ Total: number }[], DocumentoResumenRow[]];
    return { items: rows.map(toDocumentoResumen), total: totalFrom(total), ...paginacion };
  }
}
