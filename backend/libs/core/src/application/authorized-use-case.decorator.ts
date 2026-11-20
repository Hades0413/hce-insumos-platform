import { ErrorCode, Permiso, RequestContext, tienePermiso } from '@hce/contracts';
import { AppError } from '@hce/core';
import { UseCase } from './use-case';

export class AuthorizedUseCase<I, O> implements UseCase<I, O> {
  constructor(
    private readonly inner: UseCase<I, O>,
    private readonly permiso: Permiso,
  ) {}

  execute(input: I, ctx: RequestContext): Promise<O> {
    if (!ctx || !tienePermiso(ctx.permisos, this.permiso)) {
      return Promise.reject(new AppError(ErrorCode.FORBIDDEN, 'No tiene permisos para realizar esta operación.'));
    }
    return this.inner.execute(input, ctx);
  }
}
