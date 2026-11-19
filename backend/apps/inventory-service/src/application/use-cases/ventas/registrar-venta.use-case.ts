import { Logger } from '@nestjs/common';
import { AppError } from '@hce/common';
import { ErrorCode, RegistrarVentaRequest, RequestContext, VentaDetalleDto } from '@hce/contracts';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { Venta, errorStockInsuficiente } from '../../../domain/venta/venta';
import { VentaRepository } from '../../../domain/venta/venta.repository.port';
import { UseCase } from '../../ports/use-case';
import { hashItems, validarIdempotencyKey } from '../../request-hash';

const MAX_INTENTOS = 3;

/**
 * Registrar Venta (requisito 1.2.2):
 * 1. Carga productos (precio vigente + stock según movimientos).
 * 2. El agregado valida stock y calcula Subtotal / IGV / Total.
 * 3. El SP revalida stock y precio bajo lock (sin sobreventa concurrente) y
 *    registra VentaCab/VentaDet + movimiento de SALIDA.
 * Si el precio cambió entre 1 y 3 (compra concurrente), se reintenta con datos frescos.
 */
export class RegistrarVentaUseCase implements UseCase<RegistrarVentaRequest, VentaDetalleDto> {
  private readonly logger = new Logger(RegistrarVentaUseCase.name);

  constructor(
    private readonly productos: ProductoRepository,
    private readonly ventas: VentaRepository,
    private readonly politica: PoliticaPrecios,
  ) {}

  async execute(input: RegistrarVentaRequest, ctx: RequestContext): Promise<VentaDetalleDto> {
    const idempotencyKey = validarIdempotencyKey(input.idempotencyKey);
    const requestHash = hashItems(Array.isArray(input.items) ? input.items : []);

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const ids = Array.isArray(input.items) ? input.items.map((i) => i.productoId) : [];
      const productos = await this.productos.obtenerPorIds(ids.filter((id) => Number.isSafeInteger(id)));
      const venta = Venta.registrar(input.items, new Map(productos.map((p) => [p.id, p])), this.politica);

      const resultado = await this.ventas.registrar(venta, { idempotencyKey, requestHash }, ctx);
      switch (resultado.tipo) {
        case 'REGISTRADA':
        case 'IDEMPOTENTE': {
          const detalle = await this.ventas.obtener(resultado.id);
          if (!detalle) throw new AppError(ErrorCode.INTERNAL_ERROR, 'La venta registrada no pudo leerse.');
          return detalle;
        }
        case 'STOCK_INSUFICIENTE': {
          const indices = new Map(input.items.map((item, index) => [item.productoId, index]));
          throw errorStockInsuficiente(resultado.conflictos, indices);
        }
        case 'PRECIO_CAMBIADO':
          this.logger.warn({ requestId: ctx.requestId, intento }, 'Precio cambiado durante la venta; reintentando');
          continue;
      }
    }
    throw new AppError(
      ErrorCode.CONCURRENCY_CONFLICT,
      'Los precios cambiaron mientras se registraba la venta. Revise y vuelva a intentar.',
    );
  }
}
