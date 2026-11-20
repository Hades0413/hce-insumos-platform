import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { GatewayRequest } from '../security/authenticated-user';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: GatewayRequest, res: Response, next: NextFunction): void {
    req.requestId ??= randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  }
}
