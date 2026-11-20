import { AppError } from '@hce/core';
import { IdRequest, VentaDetalleDto } from '@hce/contracts';
import { validarId } from '../../../domain/shared/cantidad';
import { VentaRepository } from '../../../domain/venta/venta.repository.port';
import { UseCase } from '@hce/core';

export class ObtenerVentaUseCase implements UseCase<IdRequest, VentaDetalleDto> {
  constructor(private readonly ventas: VentaRepository) {}

  async execute(input: IdRequest): Promise<VentaDetalleDto> {
    const venta = await this.ventas.obtener(validarId(input.id, 'id'));
    if (!venta) throw AppError.notFound('La venta no existe.');
    return venta;
  }
}
