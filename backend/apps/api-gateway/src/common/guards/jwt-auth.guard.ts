import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '@hce/core';
import { AccessTokenClaims, ErrorCode, ROLES, sanearPermisos } from '@hce/contracts';
import { PermissionsChangedStore } from '../../auth/revocation/permissions-changed.store';
import { RevokedSessionsStore } from '../../auth/revocation/revoked-sessions.store';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser, GatewayRequest } from '../security/authenticated-user';
import { COOKIE_NAMES } from '../security/cookies';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly revoked: RevokedSessionsStore,
    private readonly permissionsChanged: PermissionsChangedStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<GatewayRequest>();
    if (isPublic) {
      if (!(await this.tryAuthenticate(req))) await this.bindCsrfToSession(req);
      return true;
    }
    if (!(await this.tryAuthenticate(req, true))) {
      throw new AppError(ErrorCode.UNAUTHENTICATED, 'La sesión expiró o el token es inválido.');
    }
    return true;
  }

  private async tryAuthenticate(req: GatewayRequest, required = false): Promise<boolean> {
    const token = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAMES.ACCESS];
    if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
      if (required) throw new AppError(ErrorCode.UNAUTHENTICATED, 'Sesión no iniciada.');
      return false;
    }
    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims & { exp: number; iat: number }>(token);
      if (!(ROLES as readonly string[]).includes(claims.rol)) throw new Error('rol inválido');
      if (typeof claims.sid !== 'string' || this.revoked.isRevoked(claims.sid)) throw new Error('sesión revocada');
      if (this.permissionsChanged.isStale(claims.sub, claims.iat)) {
        if (required) throw new AppError(ErrorCode.PERMISSIONS_CHANGED, 'Sus permisos cambiaron. Actualizando sesión…');
        return false;
      }
      const user: AuthenticatedUser = {
        id: claims.sub,
        email: claims.email,
        nombreCompleto: claims.name,
        rol: claims.rol,
        permisos: sanearPermisos(claims.perms),
        iat: claims.iat,
        sid: claims.sid,
        exp: claims.exp,
      };
      req.user = user;
      return true;
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      return false;
    }
  }

  private async bindCsrfToSession(req: GatewayRequest): Promise<void> {
    const token = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAMES.ACCESS];
    if (typeof token !== 'string' || token.length === 0 || token.length > 4096) return;
    try {
      const claims = await this.jwt.verifyAsync<{ sid?: string }>(token, { ignoreExpiration: true });
      if (typeof claims.sid === 'string' && !this.revoked.isRevoked(claims.sid)) req.csrfBinding = claims.sid;
    } catch {
      return;
    }
  }
}
