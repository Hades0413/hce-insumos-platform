import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import {
  ActualizarProductoRequest,
  CompraDetalleDto,
  CrearProductoRequest,
  DocumentoResumenDto,
  HealthDto,
  INVENTORY_PATTERNS,
  KardexItemDto,
  KardexMovimientosDto,
  MessageEnvelope,
  Paginated,
  ProductoDto,
  RangoFechasQuery,
  RegistrarCompraRequest,
  RegistrarVentaRequest,
  RequestContext,
  SearchQuery,
  VentaDetalleDto,
  PageQuery,
} from '@hce/contracts';
import { rpc } from '../common/rpc/rpc';
import { INVENTORY_CLIENT } from '../config/gateway.config';

/**
 * Patrón FACADE: punto único y simplificado hacia el subsistema de inventario
 * (inventory-service vía NATS). Encapsula: subjects, sobre con contexto de
 * seguridad/correlación, timeouts y traducción de errores. Los controladores
 * HTTP quedan delgados y no dependen del transporte (se podría cambiar NATS
 * por gRPC/HTTP tocando solo esta clase).
 */
@Injectable()
export class InventarioFacade {
  private readonly timeoutMs: number;

  constructor(
    @Inject(INVENTORY_CLIENT) private readonly client: ClientProxy,
    config: ConfigService,
  ) {
    this.timeoutMs = config.get<number>('RPC_TIMEOUT_MS', 8000);
  }

  // ---------------------------------------------------------------- Productos
  listarProductos(query: SearchQuery, ctx: RequestContext): Promise<Paginated<ProductoDto>> {
    return this.send(INVENTORY_PATTERNS.PRODUCTO_LISTAR, query, ctx);
  }

  obtenerProducto(id: number, ctx: RequestContext): Promise<ProductoDto> {
    return this.send(INVENTORY_PATTERNS.PRODUCTO_OBTENER, { id }, ctx);
  }

  registrarProducto(data: CrearProductoRequest, ctx: RequestContext): Promise<ProductoDto> {
    return this.send(INVENTORY_PATTERNS.PRODUCTO_CREAR, data, ctx);
  }

  actualizarProducto(data: ActualizarProductoRequest, ctx: RequestContext): Promise<ProductoDto> {
    return this.send(INVENTORY_PATTERNS.PRODUCTO_ACTUALIZAR, data, ctx);
  }

  async eliminarProducto(id: number, ctx: RequestContext): Promise<void> {
    await this.send(INVENTORY_PATTERNS.PRODUCTO_ELIMINAR, { id }, ctx);
  }

  // ---------------------------------------------------------------- Compras
  registrarCompra(data: RegistrarCompraRequest, ctx: RequestContext): Promise<CompraDetalleDto> {
    return this.send(INVENTORY_PATTERNS.COMPRA_REGISTRAR, data, ctx);
  }

  listarCompras(query: RangoFechasQuery, ctx: RequestContext): Promise<Paginated<DocumentoResumenDto>> {
    return this.send(INVENTORY_PATTERNS.COMPRA_LISTAR, query, ctx);
  }

  obtenerCompra(id: number, ctx: RequestContext): Promise<CompraDetalleDto> {
    return this.send(INVENTORY_PATTERNS.COMPRA_OBTENER, { id }, ctx);
  }

  // ---------------------------------------------------------------- Ventas
  registrarVenta(data: RegistrarVentaRequest, ctx: RequestContext): Promise<VentaDetalleDto> {
    return this.send(INVENTORY_PATTERNS.VENTA_REGISTRAR, data, ctx);
  }

  listarVentas(query: RangoFechasQuery, ctx: RequestContext): Promise<Paginated<DocumentoResumenDto>> {
    return this.send(INVENTORY_PATTERNS.VENTA_LISTAR, query, ctx);
  }

  obtenerVenta(id: number, ctx: RequestContext): Promise<VentaDetalleDto> {
    return this.send(INVENTORY_PATTERNS.VENTA_OBTENER, { id }, ctx);
  }

  // ---------------------------------------------------------------- Kardex
  listarKardex(query: SearchQuery, ctx: RequestContext): Promise<Paginated<KardexItemDto>> {
    return this.send(INVENTORY_PATTERNS.KARDEX_LISTAR, query, ctx);
  }

  movimientosProducto(productoId: number, query: PageQuery, ctx: RequestContext): Promise<KardexMovimientosDto> {
    return this.send(INVENTORY_PATTERNS.KARDEX_MOVIMIENTOS, { ...query, productoId }, ctx);
  }

  health(): Promise<HealthDto> {
    return rpc(this.client, INVENTORY_PATTERNS.HEALTH, {}, 2_000);
  }

  private send<T>(pattern: string, data: unknown, ctx: RequestContext): Promise<T> {
    const envelope: MessageEnvelope<unknown> = { ctx, data };
    return rpc<T>(this.client, pattern, envelope, this.timeoutMs);
  }
}
