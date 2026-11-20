import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { buildLoggerParams } from '@hce/common';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { RequestTimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { ContentTypeMiddleware } from './common/middleware/content-type.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SanitizeInputMiddleware } from './common/middleware/sanitize-input.middleware';
import { GatewayEnv, gatewayEnvSchema } from './config/gateway.config';
import { HealthModule } from './health/health.module';
import { InventarioModule } from './inventario/inventario.module';
import { MessagingModule } from './messaging/messaging.module';
import { HttpMetricsMiddleware } from './metrics/http-metrics.middleware';
import { SecurityModule } from './security/security.module';

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
    SecurityModule,
    MessagingModule,
    AuthModule,
    InventarioModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useFactory: () => new RequestTimeoutInterceptor(15_000) },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, HttpMetricsMiddleware, ContentTypeMiddleware, SanitizeInputMiddleware)
      .forRoutes('*path');
  }
}
