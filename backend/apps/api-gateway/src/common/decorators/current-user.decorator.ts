import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RequestContext } from '@hce/contracts';
import { AuthenticatedUser, GatewayRequest } from '../security/authenticated-user';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const req = ctx.switchToHttp().getRequest<GatewayRequest>();
  if (!req.user) throw new UnauthorizedException();
  return req.user;
});

export const ReqContext = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestContext => {
  const req = ctx.switchToHttp().getRequest<GatewayRequest>();
  if (!req.user) throw new UnauthorizedException();
  return { userId: req.user.id, rol: req.user.rol, permisos: req.user.permisos, requestId: req.requestId };
});
