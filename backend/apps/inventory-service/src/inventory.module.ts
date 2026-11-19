import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildLoggerParams, MssqlModule } from '@hce/common';
import { LoggerModule } from 'nestjs-pino';
import { ObservedUseCase } from './application/decorators/observed-use-case.decorator';
import { POLITICA_PRECIOS, USE_CASES } from './application/ports/tokens';
import { UseCase } from './application/ports/use-case';
import { RegistrarCompraUseCase } from './application/use-cases/compras/registrar-compra.use-case';
import { ListarComprasUseCase } from './application/use-cases/compras/listar-compras.use-case';
import { ObtenerCompraUseCase } from './application/use-cases/compras/obtener-compra.use-case';
import { ListarKardexUseCase } from './application/use-cases/kardex/listar-kardex.use-case';
import { ListarMovimientosUseCase } from './application/use-cases/kardex/listar-movimientos.use-case';
import { ActualizarProductoUseCase } from './application/use-cases/productos/actualizar-producto.use-case';
import { EliminarProductoUseCase } from './application/use-cases/productos/eliminar-producto.use-case';
import { ListarProductosUseCase } from './application/use-cases/productos/listar-productos.use-case';
import { ObtenerProductoUseCase } from './application/use-cases/productos/obtener-producto.use-case';
import { RegistrarProductoUseCase } from './application/use-cases/productos/registrar-producto.use-case';
import { ListarVentasUseCase } from './application/use-cases/ventas/listar-ventas.use-case';
import { ObtenerVentaUseCase } from './application/use-cases/ventas/obtener-venta.use-case';
import { RegistrarVentaUseCase } from './application/use-cases/ventas/registrar-venta.use-case';
import { COMPRA_REPOSITORY, CompraRepository } from './domain/compra/compra.repository.port';
import { KARDEX_READ_MODEL, KardexReadModel } from './domain/kardex/kardex.read-model.port';
import { PRODUCTO_REPOSITORY, ProductoRepository } from './domain/producto/producto.repository.port';
import { PoliticaPrecios } from './domain/shared/politica-precios';
import { VENTA_REPOSITORY, VentaRepository } from './domain/venta/venta.repository.port';
import { InventoryEnv, inventoryEnvSchema } from './infrastructure/config/inventory.config';
import {
  ComprasNatsController,
  VentasNatsController,
} from './infrastructure/messaging/nats/documentos.nats-controller';
import { KardexNatsController } from './infrastructure/messaging/nats/kardex.nats-controller';
import { ProductosNatsController } from './infrastructure/messaging/nats/productos.nats-controller';
import { MssqlCompraRepository } from './infrastructure/persistence/mssql/mssql-compra.repository';
import { MssqlKardexReadModel } from './infrastructure/persistence/mssql/mssql-kardex.read-model';
import { MssqlProductoRepository } from './infrastructure/persistence/mssql/mssql-producto.repository';
import { MssqlVentaRepository } from './infrastructure/persistence/mssql/mssql-venta.repository';

type Token = symbol | (abstract new (...args: never[]) => unknown);

/**
 * Registra un caso de uso decorado con ObservedUseCase (patrón Decorator).
 * El composition root es el ÚNICO lugar que conoce las implementaciones concretas.
 */
function useCase<D extends unknown[]>(
  token: symbol,
  name: string,
  factory: (...deps: D) => UseCase<unknown, unknown>,
  inject: Token[],
): Provider {
  return {
    provide: token,
    useFactory: (...deps: D) => new ObservedUseCase(name, factory(...deps)),
    inject,
  };
}

const ports: Provider[] = [
  { provide: PRODUCTO_REPOSITORY, useClass: MssqlProductoRepository },
  { provide: COMPRA_REPOSITORY, useClass: MssqlCompraRepository },
  { provide: VENTA_REPOSITORY, useClass: MssqlVentaRepository },
  { provide: KARDEX_READ_MODEL, useClass: MssqlKardexReadModel },
  {
    provide: POLITICA_PRECIOS,
    inject: [ConfigService],
    useFactory: (config: ConfigService<InventoryEnv, true>) =>
      PoliticaPrecios.fromRates(config.get('IGV_RATE', { infer: true }), config.get('MARGEN_VENTA', { infer: true })),
  },
];

const useCases: Provider[] = [
  useCase(
    USE_CASES.REGISTRAR_PRODUCTO,
    'RegistrarProducto',
    (r: ProductoRepository, p: PoliticaPrecios) => new RegistrarProductoUseCase(r, p),
    [PRODUCTO_REPOSITORY, POLITICA_PRECIOS],
  ),
  useCase(
    USE_CASES.ACTUALIZAR_PRODUCTO,
    'ActualizarProducto',
    (r: ProductoRepository, p: PoliticaPrecios) => new ActualizarProductoUseCase(r, p),
    [PRODUCTO_REPOSITORY, POLITICA_PRECIOS],
  ),
  useCase(USE_CASES.ELIMINAR_PRODUCTO, 'EliminarProducto', (r: ProductoRepository) => new EliminarProductoUseCase(r), [
    PRODUCTO_REPOSITORY,
  ]),
  useCase(USE_CASES.OBTENER_PRODUCTO, 'ObtenerProducto', (r: ProductoRepository) => new ObtenerProductoUseCase(r), [
    PRODUCTO_REPOSITORY,
  ]),
  useCase(USE_CASES.LISTAR_PRODUCTOS, 'ListarProductos', (r: ProductoRepository) => new ListarProductosUseCase(r), [
    PRODUCTO_REPOSITORY,
  ]),
  useCase(
    USE_CASES.REGISTRAR_COMPRA,
    'RegistrarCompra',
    (r: ProductoRepository, c: CompraRepository, p: PoliticaPrecios) => new RegistrarCompraUseCase(r, c, p),
    [PRODUCTO_REPOSITORY, COMPRA_REPOSITORY, POLITICA_PRECIOS],
  ),
  useCase(USE_CASES.LISTAR_COMPRAS, 'ListarCompras', (c: CompraRepository) => new ListarComprasUseCase(c), [
    COMPRA_REPOSITORY,
  ]),
  useCase(USE_CASES.OBTENER_COMPRA, 'ObtenerCompra', (c: CompraRepository) => new ObtenerCompraUseCase(c), [
    COMPRA_REPOSITORY,
  ]),
  useCase(
    USE_CASES.REGISTRAR_VENTA,
    'RegistrarVenta',
    (r: ProductoRepository, v: VentaRepository, p: PoliticaPrecios) => new RegistrarVentaUseCase(r, v, p),
    [PRODUCTO_REPOSITORY, VENTA_REPOSITORY, POLITICA_PRECIOS],
  ),
  useCase(USE_CASES.LISTAR_VENTAS, 'ListarVentas', (v: VentaRepository) => new ListarVentasUseCase(v), [
    VENTA_REPOSITORY,
  ]),
  useCase(USE_CASES.OBTENER_VENTA, 'ObtenerVenta', (v: VentaRepository) => new ObtenerVentaUseCase(v), [
    VENTA_REPOSITORY,
  ]),
  useCase(USE_CASES.LISTAR_KARDEX, 'ListarKardex', (k: KardexReadModel) => new ListarKardexUseCase(k), [
    KARDEX_READ_MODEL,
  ]),
  useCase(USE_CASES.LISTAR_MOVIMIENTOS, 'ListarMovimientos', (k: KardexReadModel) => new ListarMovimientosUseCase(k), [
    KARDEX_READ_MODEL,
  ]),
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: inventoryEnvSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<InventoryEnv, true>) =>
        buildLoggerParams(
          'inventory-service',
          config.get('LOG_LEVEL', { infer: true }),
          config.get('LOG_PRETTY', { infer: true }),
        ),
    }),
    MssqlModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<InventoryEnv, true>) => ({
        server: config.get('DB_HOST', { infer: true }),
        port: config.get('DB_PORT', { infer: true }),
        database: config.get('DB_NAME', { infer: true }),
        user: config.get('DB_USER', { infer: true }),
        password: config.get('DB_PASSWORD', { infer: true }),
        encrypt: config.get('DB_ENCRYPT', { infer: true }),
        trustServerCertificate: config.get('DB_TRUST_SERVER_CERT', { infer: true }),
        poolMax: config.get('DB_POOL_MAX', { infer: true }),
        poolMin: config.get('DB_POOL_MIN', { infer: true }),
        requestTimeoutMs: config.get('DB_REQUEST_TIMEOUT_MS', { infer: true }),
        appName: 'hce-inventory-service',
      }),
    }),
  ],
  controllers: [ProductosNatsController, ComprasNatsController, VentasNatsController, KardexNatsController],
  providers: [...ports, ...useCases],
})
export class InventoryModule {}
