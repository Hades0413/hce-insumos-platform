import { AppError } from '@hce/core';
import { ErrorCode, RegistrarVentaRequest, RequestContext, VentaDetalleDto } from '@hce/contracts';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { Venta, errorStockInsuficiente } from '../../../domain/venta/venta';
import { VentaRepository } from '../../../domain/venta/venta.repository.port';
import { UseCase } from '@hce/core';
import { hashItems, resolverReintento, validarIdempotencyKey } from '../../request-hash';

const MAX_INTENTOS = 3;

export class RegistrarVentaUseCase implements UseCase<RegistrarVentaRequest, VentaDetalleDto> {
  constructor(
    private readonly productos: ProductoRepository,
    private readonly ventas: VentaRepository,
    private readonly politica: PoliticaPrecios,
  ) {}

  async execute(input: RegistrarVentaRequest, ctx: RequestContext): Promise<VentaDetalleDto> {
    const idempotencyKey = validarIdempotencyKey(input.idempotencyKey);
    const requestHash = hashItems(Array.isArray(input.items) ? input.items : [], ctx.userId);
    const previo = resolverReintento(await this.ventas.buscarPorIdempotencia(idempotencyKey), requestHash);
    if (previo !== null) return this.leer(previo);

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const ids = Array.isArray(input.items) ? input.items.map((i) => i.productoId) : [];
      const productos = await this.productos.obtenerPorIds(ids.filter((id) => Number.isSafeInteger(id)));
      const venta = Venta.registrar(input.items, new Map(productos.map((p) => [p.id, p])), this.politica);

      const resultado = await this.ventas.registrar(venta, { idempotencyKey, requestHash }, ctx);
      switch (resultado.tipo) {
        case 'REGISTRADA':
        case 'IDEMPOTENTE':
          return this.leer(resultado.id);
        case 'STOCK_INSUFICIENTE': {
          const indices = new Map(input.items.map((item, index) => [item.productoId, index]));
          throw errorStockInsuficiente(resultado.conflictos, indices);
        }
        case 'PRECIO_CAMBIADO':
          continue;
      }
    }
    throw new AppError(
      ErrorCode.CONCURRENCY_CONFLICT,
      'Los precios cambiaron mientras se registraba la venta. Revise y vuelva a intentar.',
    );
  }

  private async leer(id: number): Promise<VentaDetalleDto> {
    const detalle = await this.ventas.obtener(id);
    if (!detalle) throw new AppError(ErrorCode.INTERNAL_ERROR, 'La venta registrada no pudo leerse.');
    return detalle;
  }
}
