import { ErrorCode, Permiso, RequestContext } from '@hce/contracts';
import { AuthorizedUseCase } from './authorized-use-case.decorator';

const ctx = (permisos: Permiso[]): RequestContext => ({ userId: 'u', rol: 'FARMACEUTICO', permisos, requestId: 'r' });

describe('AuthorizedUseCase (patrón Decorator)', () => {
  const inner = { execute: jest.fn().mockResolvedValue('ok') };
  const useCase = new AuthorizedUseCase(inner, 'compras.registrar');

  it('autoriza por permiso efectivo (p. ej. excepción GRANT), independiente del rol', async () => {
    await expect(useCase.execute('x', ctx(['compras.registrar']))).resolves.toBe('ok');
  });

  it('rechaza sin el permiso y no ejecuta el caso de uso', async () => {
    inner.execute.mockClear();
    await expect(useCase.execute('x', ctx(['ventas.registrar']))).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
    expect(inner.execute).not.toHaveBeenCalled();
  });
});
