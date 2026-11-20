import { TraceContext } from '@hce/contracts';
import { AppError } from '@hce/core';
import { OperationObserver } from './operation-observer.port';
import { UseCase } from './use-case';

export class ObservedUseCase<I, O, C extends TraceContext> implements UseCase<I, O, C> {
  constructor(
    private readonly name: string,
    private readonly inner: UseCase<I, O, C>,
    private readonly observer: OperationObserver,
  ) {}

  async execute(input: I, ctx: C): Promise<O> {
    const userId = (ctx as Partial<{ userId: string }> | undefined)?.userId ?? 'anonimo';
    const done = this.observer.start(this.name, { requestId: ctx?.requestId ?? 'n/a', userId });
    try {
      const result = await this.inner.execute(input, ctx);
      done({ kind: 'success' });
      return result;
    } catch (error: unknown) {
      done(error instanceof AppError ? { kind: 'business', code: error.code } : { kind: 'error', error });
      throw error;
    }
  }
}
