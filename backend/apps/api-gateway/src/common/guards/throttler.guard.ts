import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/** Rate limit por IP real (respeta TRUST_PROXY) y excluye health checks de orquestadores. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(((req as unknown as Request).ip ?? 'unknown').replace(/^::ffff:/, ''));
  }

  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    return Promise.resolve(req.path.endsWith('/health') || req.path.endsWith('/health/live'));
  }
}
