import { applyDecorators, createParamDecorator, ExecutionContext, UseInterceptors } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { IdempotencyKeyInterceptor } from '../interceptors/idempotency-key.interceptor';
import { GatewayRequest } from '../security/authenticated-user';

/** Exige header Idempotency-Key (UUID) y lo documenta en OpenAPI. */
export function Idempotent() {
  return applyDecorators(
    UseInterceptors(IdempotencyKeyInterceptor),
    ApiHeader({
      name: 'Idempotency-Key',
      required: true,
      description: 'UUID v4 por intento de registro. Reintentar con la misma key nunca duplica el documento.',
      schema: { type: 'string', format: 'uuid' },
    }),
  );
}

export const IdempotencyKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest<GatewayRequest>().idempotencyKey ?? '',
);
