import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { splitCsv } from '@hce/common';
import cookieParser from 'cookie-parser';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import helmet from 'helmet';
import { buildValidationPipe } from './common/pipes';
import { GatewayEnv } from './config/gateway.config';

export function configureApp(app: NestExpressApplication): INestApplication {
  const config = app.get(ConfigService<GatewayEnv, true>);
  const prefix = config.get('API_PREFIX', { infer: true });

  app.disable('x-powered-by');
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
      xContentTypeOptions: true,
      xFrameOptions: { action: 'deny' },
    }),
  );
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.enableCors({
    origin: splitCsv(config.get('CORS_ORIGINS', { infer: true })),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });

  const limit = config.get('BODY_LIMIT', { infer: true });
  app.use(json({ limit }));
  app.use(urlencoded({ extended: false, limit }));
  app.use(cookieParser());
  app.use((err: { status?: number; type?: string }, req: Request, res: Response, next: NextFunction) => {
    if (!err?.type?.startsWith('entity.') && err?.status !== 413) return next(err);
    const status = err.status === 413 ? 413 : 400;
    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: status === 413 ? 'Payload Too Large' : 'Bad Request',
        status,
        code: 'VALIDATION_ERROR',
        detail: status === 413 ? 'El cuerpo de la solicitud es demasiado grande.' : 'JSON mal formado.',
        instance: req.path,
      });
  });

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(buildValidationPipe());
  app.enableShutdownHooks();

  return app;
}
