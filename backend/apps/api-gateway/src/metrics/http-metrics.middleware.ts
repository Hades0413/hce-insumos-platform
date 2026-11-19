import { Injectable, NestMiddleware } from '@nestjs/common';
import { metricsRegistry } from '@hce/common';
import type { NextFunction, Request, Response } from 'express';
import { Histogram } from 'prom-client';

const httpDuration = new Histogram({
  name: 'hce_http_request_duration_seconds',
  help: 'Latencia de requests HTTP del API Gateway',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

/** RED metrics por ruta (plantilla, no URL concreta => cardinalidad acotada). */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const end = httpDuration.startTimer({ method: req.method });
    res.on('finish', () => {
      const routePath = (req.route as { path?: string } | undefined)?.path;
      end({ route: routePath ? `${req.baseUrl}${routePath}` : 'unmatched', status: String(res.statusCode) });
    });
    next();
  }
}
