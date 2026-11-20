import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from '@hce/core';
import { ErrorCode } from '@hce/contracts';
import { GatewayRequest } from '../security/authenticated-user';
import { COOKIE_NAMES, CSRF_HEADER } from '../security/cookies';
import { ANONYMOUS_BINDING, CsrfTokenService } from '../security/csrf-token.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<GatewayRequest>();
    if (SAFE_METHODS.has(req.method)) return true;
    const cookie = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAMES.CSRF];
    if (this.csrf.matches(cookie, req.header(CSRF_HEADER), req.user?.sid ?? req.csrfBinding ?? ANONYMOUS_BINDING))
      return true;
    throw new AppError(ErrorCode.CSRF_INVALID, 'Token CSRF ausente o inválido. Recargue la página.');
  }
}
