import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { natsServerOptions, registerDefaultMetrics, RpcProblemFilter, splitCsv, startMetricsServer } from '@hce/common';
import { QUEUE_GROUPS } from '@hce/contracts';
import { Logger } from 'nestjs-pino';
import { InventoryModule } from './inventory.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(InventoryModule, {
    ...natsServerOptions(
      {
        servers: splitCsv(process.env.NATS_SERVERS),
        user: process.env.NATS_USER ?? '',
        pass: process.env.NATS_PASSWORD ?? '',
      },
      QUEUE_GROUPS.INVENTORY,
      'inventory-service',
    ),
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new RpcProblemFilter());
  app.enableShutdownHooks();

  registerDefaultMetrics('inventory-service');
  const metrics = startMetricsServer(Number(process.env.METRICS_PORT ?? 9464));
  process.once('SIGTERM', () => metrics.close());

  await app.listen();
  app.get(Logger).log(`inventory-service escuchando en NATS (queue=${QUEUE_GROUPS.INVENTORY})`);
}

void bootstrap();
