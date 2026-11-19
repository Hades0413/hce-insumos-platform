import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@hce/common';
import { ErrorCode, Rol } from '@hce/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { GatewayRequest } from '../security/authenticated-user';

/** RBAC: ADMIN tiene acceso total; el resto solo a lo declarado con @Auth(...roles). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const user = context.switchToHttp().getRequest<GatewayRequest>().user;
    if (user && (user.rol === 'ADMIN' || required.includes(user.rol))) return true;
    throw new AppError(ErrorCode.FORBIDDEN, 'No tiene permisos para realizar esta operación.');
  }
}
