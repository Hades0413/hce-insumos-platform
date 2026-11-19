import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { registerDefaultMetrics, startMetricsServer } from '@hce/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GatewayEnv } from './config/gateway.config';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });
  const config = app.get(ConfigService<GatewayEnv, true>);
  const logger = app.get(Logger);
  app.useLogger(logger);

  const prefix = config.get('API_PREFIX', { infer: true });
  const swaggerEnabled = config.get('SWAGGER_ENABLED', { infer: true });

  configureApp(app);

  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('HCE Insumos — API Gateway')
        .setDescription(
          'API REST para control de medicamentos/insumos (compras, ventas, kardex). ' +
            'Autenticación por cookies HttpOnly (JWT ES256 de 30 min). Para operaciones de escritura: ' +
            '1) GET /auth/csrf, 2) enviar el token en X-CSRF-Token. Errores en formato RFC 7807.',
        )
        .setVersion('1.0.0')
        .addCookieAuth('hce_at', { type: 'apiKey', in: 'cookie', name: 'hce_at' }, 'hce_at')
        .addApiKey({ type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }, 'csrf')
        .addSecurityRequirements('csrf')
        .build(),
    );
    document.components = {
      ...document.components,
      schemas: {
        ...document.components?.schemas,
        ProblemDetails: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'integer' },
            code: { type: 'string' },
            detail: { type: 'string' },
            instance: { type: 'string' },
            requestId: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    };
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
      swaggerOptions: { withCredentials: true, persistAuthorization: false },
    });
  }

  registerDefaultMetrics('api-gateway');
  const metrics = startMetricsServer(config.get('METRICS_PORT', { infer: true }));
  process.once('SIGTERM', () => metrics.close());

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway en http://0.0.0.0:${port}/${prefix}${swaggerEnabled ? ` — Swagger: /api/docs` : ''}`);
}

void bootstrap();
