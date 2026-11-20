import { Injectable, NestMiddleware } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

@Injectable()
export class ContentTypeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
    if (WITH_BODY.has(req.method) && hasBody && !req.is('application/json')) {
      throw new HttpException('Solo se acepta Content-Type: application/json.', HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    next();
  }
}
