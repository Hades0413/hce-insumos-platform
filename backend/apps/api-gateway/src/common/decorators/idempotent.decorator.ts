import { applyDecorators, createParamDecorator, ExecutionContext, UseInterceptors } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { IdempotencyKeyInterceptor } from '../interceptors/idempotency-key.interceptor';
import { GatewayRequest } from '../security/authenticated-user';

export function Idempotent() {
  return applyDecorators(
    UseInterceptors(IdempotencyKeyInterceptor),
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description:
        'UUID v4 por intento de registro (obligatorio). Reintentar con la misma key devuelve el mismo documento. En Swagger, déjalo vacío y se genera solo.',
      schema: { type: 'string', format: 'uuid' },
    }),
  );
}

export const IdempotencyKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest<GatewayRequest>().idempotencyKey ?? '',
);
