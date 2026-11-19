import { Injectable } from '@nestjs/common';
import { AppError, MssqlExecutor } from '@hce/common';
import { CompraDetalleDto, DocumentoResumenDto, ErrorCode } from '@hce/contracts';
import * as sql from 'mssql';
import { Compra } from '../../../domain/compra/compra';
import {
  CompraRepository,
  MetadatosIdempotencia,
  RangoFechas,
  ResultadoRegistroCompra,
} from '../../../domain/compra/compra.repository.port';
import { AuditContext, Pagina, Paginacion } from '../../../domain/shared/audit-context';
import { bindContext } from './mssql-producto.repository';
import {
  DocumentoLineaRow,
  DocumentoResumenRow,
  toDocumentoDetalle,
  toDocumentoResumen,
  totalFrom,
} from './row-mappers';

@Injectable()
export class MssqlCompraRepository implements CompraRepository {
  constructor(private readonly db: MssqlExecutor) {}

  /** Documento completo en UN round-trip (TVP) y UNA transacción (SP). */
  async registrar(compra: Compra, meta: MetadatosIdempotencia, ctx: AuditContext): Promise<ResultadoRegistroCompra> {
    const lineas = new sql.Table('dbo.tt_LineaCompra');
    lineas.columns.add('Id_producto', sql.Int, { nullable: false });
    lineas.columns.add('Cantidad', sql.Int, { nullable: false });
    lineas.columns.add('Precio', sql.Decimal(18, 2), { nullable: false });
    lineas.columns.add('Sub_Total', sql.Decimal(18, 2), { nullable: false });
    lineas.columns.add('Igv', sql.Decimal(18, 2), { nullable: false });
    lineas.columns.add('Total', sql.Decimal(18, 2), { nullable: false });
    lineas.columns.add('NuevoPrecioVenta', sql.Decimal(18, 2), { nullable: false });
    for (const l of compra.lineas) {
      lineas.rows.add(
        l.productoId,
        l.cantidad,
        l.precio.toDecimal(),
        l.subTotal.toDecimal(),
        l.igv.toDecimal(),
        l.total.toDecimal(),
        l.nuevoPrecioVenta.toDecimal(),
      );
    }

    const result = await registrarIdempotente(() =>
      this.db.execute('dbo.usp_Compra_Registrar', (r) => {
        r.input('Lineas', lineas);
        r.input('SubTotal', sql.Decimal(18, 2), compra.totales.subTotal.toDecimal());
        r.input('Igv', sql.Decimal(18, 2), compra.totales.igv.toDecimal());
        r.input('Total', sql.Decimal(18, 2), compra.totales.total.toDecimal());
        r.input('IdempotencyKey', sql.UniqueIdentifier, meta.idempotencyKey);
        r.input('RequestHash', sql.VarBinary(32), meta.requestHash);
        bindContext(r, ctx);
        r.output('Id_CompraCab', sql.Int);
        r.output('Resultado', sql.VarChar(30));
      }),
    );
    const resultado = result.output.Resultado as string;
    const id = result.output.Id_CompraCab as number;
    if (resultado === 'IDEMPOTENCY_CONFLICT') throw idempotencyConflict();
    return { tipo: resultado === 'IDEMPOTENTE' ? 'IDEMPOTENTE' : 'REGISTRADA', id };
  }

  async obtener(id: number): Promise<CompraDetalleDto | null> {
    const result = await this.db.execute('dbo.usp_Compra_Obtener', (r) => r.input('Id_CompraCab', sql.Int, id));
    const [cab, lineas] = result.recordsets as unknown as [DocumentoResumenRow[], DocumentoLineaRow[]];
    return cab[0] ? toDocumentoDetalle(cab[0], lineas) : null;
  }

  async listar(rango: RangoFechas, paginacion: Paginacion): Promise<Pagina<DocumentoResumenDto>> {
    const result = await this.db.execute('dbo.usp_Compra_Listar', (r) => {
      r.input('Desde', sql.Date, rango.desde ?? null);
      r.input('Hasta', sql.Date, rango.hasta ?? null);
      r.input('Page', sql.Int, paginacion.page);
      r.input('PageSize', sql.Int, paginacion.pageSize);
    });
    const [total, rows] = result.recordsets as unknown as [{ Total: number }[], DocumentoResumenRow[]];
    return { items: rows.map(toDocumentoResumen), total: totalFrom(total), ...paginacion };
  }
}

export function idempotencyConflict(): AppError {
  return new AppError(
    ErrorCode.IDEMPOTENCY_CONFLICT,
    'La Idempotency-Key ya fue usada con un contenido distinto. Genere una nueva para un documento nuevo.',
  );
}

/**
 * Dos reintentos simultáneos con la MISMA key: uno gana, el otro choca con el
 * índice único filtrado (DUPLICATE). Se re-ejecuta y el SP responde IDEMPOTENTE.
 */
export async function registrarIdempotente<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === ErrorCode.DUPLICATE) return run();
    throw error;
  }
}
