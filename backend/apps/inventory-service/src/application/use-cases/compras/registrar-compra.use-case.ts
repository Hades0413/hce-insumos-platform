import { AppError } from '@hce/common';
import { CompraDetalleDto, ErrorCode, RegistrarCompraRequest, RequestContext } from '@hce/contracts';
import { Compra } from '../../../domain/compra/compra';
import { CompraRepository } from '../../../domain/compra/compra.repository.port';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { UseCase } from '../../ports/use-case';
import { hashItems, validarIdempotencyKey } from '../../request-hash';

/**
 * Registrar Compra (requisito 1.2.1):
 * CompraCab + CompraDet, actualiza costo y precio de venta (costo × 1.35) y
 * genera el movimiento de ENTRADA — todo atómico en una transacción.
 */
export class RegistrarCompraUseCase implements UseCase<RegistrarCompraRequest, CompraDetalleDto> {
  constructor(
    private readonly productos: ProductoRepository,
    private readonly compras: CompraRepository,
    private readonly politica: PoliticaPrecios,
  ) {}

  async execute(input: RegistrarCompraRequest, ctx: RequestContext): Promise<CompraDetalleDto> {
    const idempotencyKey = validarIdempotencyKey(input.idempotencyKey);
    const compra = Compra.registrar(input.items, this.politica);

    const existentes = await this.productos.obtenerPorIds(compra.productoIds);
    const encontrados = new Set(existentes.map((p) => p.id));
    const faltantes = compra.lineas
      .map((l, index) => ({ productoId: l.productoId, index }))
      .filter((l) => !encontrados.has(l.productoId));
    if (faltantes.length) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Uno o más productos no existen. Regístrelos antes de la compra.',
        faltantes.map((f) => ({
          field: `items[${f.index}].productoId`,
          message: 'El producto no existe',
          productoId: f.productoId,
        })),
      );
    }

    const resultado = await this.compras.registrar(
      compra,
      { idempotencyKey, requestHash: hashItems(input.items) },
      ctx,
    );
    const detalle = await this.compras.obtener(resultado.id);
    if (!detalle) throw new AppError(ErrorCode.INTERNAL_ERROR, 'La compra registrada no pudo leerse.');
    return detalle;
  }
}
