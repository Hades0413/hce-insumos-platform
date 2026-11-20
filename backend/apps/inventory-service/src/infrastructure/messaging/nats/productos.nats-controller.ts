import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ActualizarProductoRequest,
  CrearProductoRequest,
  IdRequest,
  INVENTORY_PATTERNS,
  MessageEnvelope,
  Paginated,
  ProductoDto,
  SearchQuery,
} from '@hce/contracts';
import { USE_CASES } from '../../../application/ports/tokens';
import { UseCase } from '@hce/core';

@Controller()
export class ProductosNatsController {
  constructor(
    @Inject(USE_CASES.REGISTRAR_PRODUCTO) private readonly registrar: UseCase<CrearProductoRequest, ProductoDto>,
    @Inject(USE_CASES.ACTUALIZAR_PRODUCTO) private readonly actualizar: UseCase<ActualizarProductoRequest, ProductoDto>,
    @Inject(USE_CASES.ELIMINAR_PRODUCTO) private readonly eliminar: UseCase<IdRequest, void>,
    @Inject(USE_CASES.OBTENER_PRODUCTO) private readonly obtener: UseCase<IdRequest, ProductoDto>,
    @Inject(USE_CASES.LISTAR_PRODUCTOS) private readonly listar: UseCase<SearchQuery, Paginated<ProductoDto>>,
  ) {}

  @MessagePattern(INVENTORY_PATTERNS.PRODUCTO_CREAR)
  crear(@Payload() msg: MessageEnvelope<CrearProductoRequest>): Promise<ProductoDto> {
    return this.registrar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.PRODUCTO_ACTUALIZAR)
  update(@Payload() msg: MessageEnvelope<ActualizarProductoRequest>): Promise<ProductoDto> {
    return this.actualizar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.PRODUCTO_ELIMINAR)
  async delete(@Payload() msg: MessageEnvelope<IdRequest>): Promise<{ deleted: true }> {
    await this.eliminar.execute(msg.data, msg.ctx);
    return { deleted: true };
  }

  @MessagePattern(INVENTORY_PATTERNS.PRODUCTO_OBTENER)
  get(@Payload() msg: MessageEnvelope<IdRequest>): Promise<ProductoDto> {
    return this.obtener.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.PRODUCTO_LISTAR)
  list(@Payload() msg: MessageEnvelope<SearchQuery>): Promise<Paginated<ProductoDto>> {
    return this.listar.execute(msg.data, msg.ctx);
  }
}
