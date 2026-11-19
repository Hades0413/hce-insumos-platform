import { AppError } from '@hce/common';
import { ErrorCode, RequestContext } from '@hce/contracts';
import { ObservedUseCase } from './observed-use-case.decorator';

const ctx: RequestContext = { userId: 'u', rol: 'ADMIN', requestId: 'r' };

describe('ObservedUseCase (patrón Decorator)', () => {
  it('delega en el caso de uso envuelto y devuelve su resultado', async () => {
    const inner = { execute: jest.fn().mockResolvedValue(42) };
    await expect(new ObservedUseCase('X', inner).execute('in', ctx)).resolves.toBe(42);
    expect(inner.execute).toHaveBeenCalledWith('in', ctx);
  });

  it('propaga los errores sin alterarlos', async () => {
    const error = new AppError(ErrorCode.NOT_FOUND, 'no');
    const inner = { execute: jest.fn().mockRejectedValue(error) };
    await expect(new ObservedUseCase('X', inner).execute('in', ctx)).rejects.toBe(error);
  });
});
