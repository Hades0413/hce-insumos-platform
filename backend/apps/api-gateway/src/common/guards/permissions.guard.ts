import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@hce/core';
import { ErrorCode, Permiso } from '@hce/contracts';
import { PERMISOS_KEY } from '../decorators/roles.decorator';
import { GatewayRequest } from '../security/authenticated-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const required = this.reflector.getAllAndOverride<Permiso[] | undefined>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const user = context.switchToHttp().getRequest<GatewayRequest>().user;
    if (user && required.every((p) => user.permisos.includes(p))) return true;
    throw new AppError(ErrorCode.FORBIDDEN, 'No tiene permisos para realizar esta operación.');
  }
}
