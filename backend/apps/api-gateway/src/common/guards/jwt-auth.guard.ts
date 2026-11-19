import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '@hce/common';
import { AccessTokenClaims, ErrorCode, ROLES } from '@hce/contracts';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser, GatewayRequest } from '../security/authenticated-user';
import { COOKIE_NAMES } from '../security/cookies';

/**
 * Verifica el access token LOCALMENTE (clave pública ES256, sin round-trip a
 * auth-service => sin cuello de botella). Algoritmo, emisor y audiencia fijados
 * (evita "alg confusion" y tokens de otros sistemas). Deny-by-default.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<GatewayRequest>();
    const token = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAMES.ACCESS];
    if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
      throw new AppError(ErrorCode.UNAUTHENTICATED, 'Sesión no iniciada.');
    }
    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims & { exp: number }>(token);
      if (!(ROLES as readonly string[]).includes(claims.rol)) throw new Error('rol inválido');
      const user: AuthenticatedUser = {
        id: claims.sub,
        email: claims.email,
        nombreCompleto: claims.name,
        rol: claims.rol,
        exp: claims.exp,
      };
      req.user = user;
      return true;
    } catch {
      throw new AppError(ErrorCode.UNAUTHENTICATED, 'La sesión expiró o el token es inválido.');
    }
  }
}
