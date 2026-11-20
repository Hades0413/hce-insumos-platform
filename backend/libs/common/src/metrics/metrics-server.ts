import { Logger } from '@nestjs/common';
import { createServer, Server } from 'node:http';
import { Registry, collectDefaultMetrics, Histogram } from 'prom-client';

export const metricsRegistry = new Registry();
let defaultsRegistered = false;

export function registerDefaultMetrics(service: string): void {
  if (defaultsRegistered) return;
  metricsRegistry.setDefaultLabels({ service });
  collectDefaultMetrics({ register: metricsRegistry });
  defaultsRegistered = true;
}

export const operationDuration = new Histogram({
  name: 'hce_operation_duration_seconds',
  help: 'Duración de operaciones de aplicación',
  labelNames: ['operation', 'outcome'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export function startMetricsServer(port: number, logger = new Logger('Metrics')): Server {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/metrics') {
      metricsRegistry
        .metrics()
        .then((body) => {
          res.writeHead(200, { 'Content-Type': metricsRegistry.contentType });
          res.end(body);
        })
        .catch(() => {
          res.writeHead(500);
          res.end();
        });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, () => logger.log(`Métricas Prometheus en :${port}/metrics`));
  return server;
}
