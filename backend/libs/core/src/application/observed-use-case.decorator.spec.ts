import { ErrorCode, RequestContext } from '@hce/contracts';
import { AppError } from '../errors/app-error';
import { ObservedUseCase } from './observed-use-case.decorator';
import { OperationObserver, OperationOutcome } from './operation-observer.port';

const ctx: RequestContext = { userId: 'u', rol: 'ADMIN', permisos: [], requestId: 'r' };

function observer() {
  const outcomes: OperationOutcome[] = [];
  const obs: OperationObserver = { start: () => (o) => void outcomes.push(o) };
  return { obs, outcomes };
}

describe('ObservedUseCase (patrón Decorator)', () => {
  it('delega en el caso de uso y reporta éxito', async () => {
    const { obs, outcomes } = observer();
    const inner = { execute: jest.fn().mockResolvedValue(42) };
    await expect(new ObservedUseCase('X', inner, obs).execute('in', ctx)).resolves.toBe(42);
    expect(inner.execute).toHaveBeenCalledWith('in', ctx);
    expect(outcomes).toEqual([{ kind: 'success' }]);
  });

  it('propaga el error sin alterarlo y lo clasifica (negocio vs inesperado)', async () => {
    const { obs, outcomes } = observer();
    const negocio = new AppError(ErrorCode.NOT_FOUND, 'no');
    await expect(
      new ObservedUseCase('X', { execute: () => Promise.reject(negocio) }, obs).execute('i', ctx),
    ).rejects.toBe(negocio);
    const boom = new Error('boom');
    await expect(new ObservedUseCase('X', { execute: () => Promise.reject(boom) }, obs).execute('i', ctx)).rejects.toBe(
      boom,
    );
    expect(outcomes).toEqual([
      { kind: 'business', code: 'NOT_FOUND' },
      { kind: 'error', error: boom },
    ]);
  });
});
