import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AppError } from '@hce/common';
import { Observable } from 'rxjs';
import { IDEMPOTENCY_HEADER } from '../security/cookies';
import { GatewayRequest } from '../security/authenticated-user';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class IdempotencyKeyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<GatewayRequest>();
    const key = req.header(IDEMPOTENCY_HEADER);
    if (!key || !UUID.test(key)) {
      throw AppError.validation('El header Idempotency-Key (UUID) es obligatorio.', [
        { field: 'Idempotency-Key', message: 'UUID requerido' },
      ]);
    }
    req.idempotencyKey = key.toLowerCase();
    return next.handle();
  }
}
