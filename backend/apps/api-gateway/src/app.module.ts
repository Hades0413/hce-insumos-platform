import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { buildLoggerParams, natsClientOptions, splitCsv } from '@hce/common';
import { LoggerModule } from 'nestjs-pino';
import { AuthController } from './auth/auth.controller';
import { AuthFacade } from './auth/auth.facade';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { CsrfGuard } from './common/guards/csrf.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthCookiesService } from './common/security/auth-cookies.service';
import { CsrfTokenService } from './common/security/csrf-token.service';
import { AUTH_CLIENT, decodePem, GatewayEnv, gatewayEnvSchema, INVENTORY_CLIENT } from './config/gateway.config';
import { HealthController } from './health/health.controller';
import { ComprasController } from './inventario/compras.controller';
import { InventarioFacade } from './inventario/inventario.facade';
import { KardexController } from './inventario/kardex.controller';
import { ProductosController } from './inventario/productos.controller';
import { VentasController } from './inventario/ventas.controller';
import { HttpMetricsMiddleware } from './metrics/http-metrics.middleware';

const natsFromConfig = (c: ConfigService<GatewayEnv, true>) => ({
  servers: splitCsv(c.get('NATS_SERVERS', { infer: true })),
  user: c.get('NATS_USER', { infer: true }),
  pass: c.get('NATS_PASSWORD', { infer: true }),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: gatewayEnvSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService<GatewayEnv, true>) =>
        buildLoggerParams('api-gateway', c.get('LOG_LEVEL', { infer: true }), c.get('LOG_PRETTY', { infer: true }), {
          ignoreUrlsContaining: ['/health'],
        }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService<GatewayEnv, true>) => ({
        throttlers: [
          {
            name: 'default',
            ttl: c.get('THROTTLE_TTL_MS', { infer: true }),
            limit: c.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService<GatewayEnv, true>) => ({
        publicKey: decodePem(c.get('JWT_PUBLIC_KEY', { infer: true })),
        verifyOptions: {
          algorithms: ['ES256'],
          issuer: c.get('JWT_ISSUER', { infer: true }),
          audience: c.get('JWT_AUDIENCE', { infer: true }),
          clockTolerance: 5,
        },
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: AUTH_CLIENT,
        inject: [ConfigService],
        useFactory: (c: ConfigService<GatewayEnv, true>) =>
          natsClientOptions(AUTH_CLIENT, natsFromConfig(c), 'api-gateway:auth'),
      },
      {
        name: INVENTORY_CLIENT,
        inject: [ConfigService],
        useFactory: (c: ConfigService<GatewayEnv, true>) =>
          natsClientOptions(INVENTORY_CLIENT, natsFromConfig(c), 'api-gateway:inventory'),
      },
    ]),
    TerminusModule.forRoot({ errorLogStyle: 'pretty' }),
  ],
  controllers: [
    AuthController,
    ProductosController,
    ComprasController,
    VentasController,
    KardexController,
    HealthController,
  ],
  providers: [
    AuthFacade,
    InventarioFacade,
    AuthCookiesService,
    CsrfTokenService,
    // Orden de guards: rate limit -> CSRF -> autenticación -> autorización
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, HttpMetricsMiddleware).forRoutes('*path');
  }
}
