import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { GatewayRequest } from '../security/authenticated-user';
import { REQUEST_ID_HEADER } from '../security/cookies';

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Correlation ID: se acepta el del cliente solo si es seguro (evita log injection), si no se genera. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: GatewayRequest, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER);
    req.requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  }
}
