import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CompraDetalleDto,
  DocumentoResumenDto,
  IdRequest,
  INVENTORY_PATTERNS,
  MessageEnvelope,
  Paginated,
  RangoFechasQuery,
  RegistrarCompraRequest,
  RegistrarVentaRequest,
  VentaDetalleDto,
} from '@hce/contracts';
import { USE_CASES } from '../../../application/ports/tokens';
import { UseCase } from '@hce/core';

@Controller()
export class ComprasNatsController {
  constructor(
    @Inject(USE_CASES.REGISTRAR_COMPRA) private readonly registrar: UseCase<RegistrarCompraRequest, CompraDetalleDto>,
    @Inject(USE_CASES.LISTAR_COMPRAS)
    private readonly listar: UseCase<RangoFechasQuery, Paginated<DocumentoResumenDto>>,
    @Inject(USE_CASES.OBTENER_COMPRA) private readonly obtener: UseCase<IdRequest, CompraDetalleDto>,
  ) {}

  @MessagePattern(INVENTORY_PATTERNS.COMPRA_REGISTRAR)
  create(@Payload() msg: MessageEnvelope<RegistrarCompraRequest>): Promise<CompraDetalleDto> {
    return this.registrar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.COMPRA_LISTAR)
  list(@Payload() msg: MessageEnvelope<RangoFechasQuery>): Promise<Paginated<DocumentoResumenDto>> {
    return this.listar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.COMPRA_OBTENER)
  get(@Payload() msg: MessageEnvelope<IdRequest>): Promise<CompraDetalleDto> {
    return this.obtener.execute(msg.data, msg.ctx);
  }
}

@Controller()
export class VentasNatsController {
  constructor(
    @Inject(USE_CASES.REGISTRAR_VENTA) private readonly registrar: UseCase<RegistrarVentaRequest, VentaDetalleDto>,
    @Inject(USE_CASES.LISTAR_VENTAS) private readonly listar: UseCase<RangoFechasQuery, Paginated<DocumentoResumenDto>>,
    @Inject(USE_CASES.OBTENER_VENTA) private readonly obtener: UseCase<IdRequest, VentaDetalleDto>,
  ) {}

  @MessagePattern(INVENTORY_PATTERNS.VENTA_REGISTRAR)
  create(@Payload() msg: MessageEnvelope<RegistrarVentaRequest>): Promise<VentaDetalleDto> {
    return this.registrar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.VENTA_LISTAR)
  list(@Payload() msg: MessageEnvelope<RangoFechasQuery>): Promise<Paginated<DocumentoResumenDto>> {
    return this.listar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.VENTA_OBTENER)
  get(@Payload() msg: MessageEnvelope<IdRequest>): Promise<VentaDetalleDto> {
    return this.obtener.execute(msg.data, msg.ctx);
  }
}
