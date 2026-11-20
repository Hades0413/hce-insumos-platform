import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions } from '@nestjs/microservices';
import {
  installProcessGuards,
  natsBroadcastSubscriberOptions,
  registerDefaultMetrics,
  splitCsv,
  startMetricsServer,
} from '@hce/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GatewayEnv } from './config/gateway.config';
import { configureApp } from './configure-app';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });
  const config = app.get(ConfigService<GatewayEnv, true>);
  const logger = app.get(Logger);
  app.useLogger(logger);

  const prefix = config.get('API_PREFIX', { infer: true });
  const swaggerEnabled = config.get('SWAGGER_ENABLED', { infer: true });

  configureApp(app);
  installProcessGuards('api-gateway', () => app.close());

  if (swaggerEnabled) setupSwagger(app, config.get('SWAGGER_DEMO_PASSWORD', { infer: true }));

  app.connectMicroservice<MicroserviceOptions>(
    natsBroadcastSubscriberOptions(
      {
        servers: splitCsv(config.get('NATS_SERVERS', { infer: true })),
        user: config.get('NATS_USER', { infer: true }),
        pass: config.get('NATS_PASSWORD', { infer: true }),
        tlsCaFile: config.get('NATS_TLS_CA_FILE', { infer: true }),
      },
      'api-gateway:events',
    ),
  );
  await app.startAllMicroservices();

  registerDefaultMetrics('api-gateway');
  const metrics = startMetricsServer(config.get('METRICS_PORT', { infer: true }));
  process.once('SIGTERM', () => metrics.close());

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway en http://0.0.0.0:${port}/${prefix}${swaggerEnabled ? `, Swagger en /api/docs` : ''}`);
}

void bootstrap();
