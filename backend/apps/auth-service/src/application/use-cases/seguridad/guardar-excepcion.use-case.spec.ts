import { ErrorCode, RequestContext } from '@hce/contracts';
import { PermisosRepository } from '../../../domain/permisos/permisos.repository.port';
import { GuardarExcepcionUseCase } from './guardar-excepcion.use-case';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const FARMA = '22222222-2222-4222-8222-222222222222';
const ctx: RequestContext = { userId: ADMIN, rol: 'ADMIN', permisos: ['seguridad.administrar'], requestId: 'r' };

function setup() {
  const repo = {
    guardarExcepcion: jest.fn().mockResolvedValue({ efectivos: [] }),
  } as unknown as jest.Mocked<PermisosRepository>;
  const events = { sessionRevoked: jest.fn(), permissionsChanged: jest.fn() };
  const audit = { alert: jest.fn(), info: jest.fn() };
  return { repo, events, uc: new GuardarExcepcionUseCase(repo, events, audit) };
}

describe('GuardarExcepcionUseCase', () => {
  it('otorga una excepción y notifica el cambio de permisos (refresh transparente)', async () => {
    const s = setup();
    await s.uc.execute(
      { usuarioId: FARMA, permiso: 'compras.registrar', tipo: 'GRANT', motivo: 'Cubre turno de almacén' },
      ctx,
    );
    expect(s.repo.guardarExcepcion).toHaveBeenCalled();
    expect(s.events.permissionsChanged).toHaveBeenCalledWith(FARMA);
  });

  it('valida motivo, vigencia futura y permiso conocido', async () => {
    const s = setup();
    await expect(
      s.uc.execute({ usuarioId: FARMA, permiso: 'compras.registrar', tipo: 'GRANT', motivo: 'corto' }, ctx),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
    await expect(
      s.uc.execute(
        {
          usuarioId: FARMA,
          permiso: 'compras.registrar',
          tipo: 'GRANT',
          motivo: 'Motivo suficiente',
          vigenteHasta: '2000-01-01T00:00:00Z',
        },
        ctx,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
    await expect(
      s.uc.execute({ usuarioId: FARMA, permiso: 'x.y' as never, tipo: 'GRANT', motivo: 'Motivo suficiente' }, ctx),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('un administrador no puede quitarse a sí mismo seguridad.administrar', async () => {
    const s = setup();
    await expect(
      s.uc.execute(
        { usuarioId: ADMIN, permiso: 'seguridad.administrar', tipo: 'DENY', motivo: 'Intento de autobloqueo' },
        ctx,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.BUSINESS_RULE });
    expect(s.repo.guardarExcepcion).not.toHaveBeenCalled();
  });
});
