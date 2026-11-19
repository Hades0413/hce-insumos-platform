import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from '@hce/common';
import { ErrorCode } from '@hce/contracts';
import { GatewayRequest } from '../security/authenticated-user';
import { COOKIE_NAMES, CSRF_HEADER } from '../security/cookies';
import { CsrfTokenService } from '../security/csrf-token.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Toda petición que cambia estado debe traer X-CSRF-Token == cookie firmada. */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<GatewayRequest>();
    if (SAFE_METHODS.has(req.method)) return true;
    const cookie = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAMES.CSRF];
    if (this.csrf.matches(cookie, req.header(CSRF_HEADER))) return true;
    throw new AppError(ErrorCode.CSRF_INVALID, 'Token CSRF ausente o inválido. Recargue la página.');
  }
}
