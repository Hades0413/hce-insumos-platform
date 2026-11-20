import { ErrorCode } from '@hce/contracts';
import { LogoutUseCase } from './logout.use-case';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import { doubles, trace, usuario } from './session.test-doubles';

describe('RefreshSessionUseCase / LogoutUseCase', () => {
  it('rotación OK: firma un access token con permisos recalculados', async () => {
    const d = doubles();
    d.sesiones.rotar.mockResolvedValue({
      tipo: 'OK',
      usuario,
      familiaId: 'fam-1',
      expiraEn: new Date(Date.now() + 1000),
    });
    const r = await new RefreshSessionUseCase(d.sesiones, d.issuer, d.events, d.audit).execute(
      { refreshToken: 'a'.repeat(43) },
      trace,
    );
    expect(r.user.permisos).toEqual(['ventas.ver']);
    expect(d.tokens.issue).toHaveBeenCalledWith(usuario, 'fam-1', ['ventas.ver']);
  });

  it('reuso de refresh token: alerta de seguridad + revocación de la familia', async () => {
    const d = doubles();
    d.sesiones.rotar.mockResolvedValue({ tipo: 'REUTILIZADO', familiaId: 'fam-1', idUsuario: 'u1' });
    await expect(
      new RefreshSessionUseCase(d.sesiones, d.issuer, d.events, d.audit).execute(
        { refreshToken: 'a'.repeat(43) },
        trace,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.UNAUTHENTICATED });
    expect(d.events.sessionRevoked).toHaveBeenCalledWith('fam-1', 1800);
    expect(d.audit.alert).toHaveBeenCalledWith('refresh_token.reuse_detected', expect.anything());
  });

  it('refresh concurrente (otra pestaña) no revoca la familia', async () => {
    const d = doubles();
    d.sesiones.rotar.mockResolvedValue({ tipo: 'CONCURRENTE', familiaId: 'fam-1' });
    await expect(
      new RefreshSessionUseCase(d.sesiones, d.issuer, d.events, d.audit).execute(
        { refreshToken: 'a'.repeat(43) },
        trace,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.UNAUTHENTICATED });
    expect(d.events.sessionRevoked).not.toHaveBeenCalled();
  });

  it('formato inválido no consulta la BD', async () => {
    const d = doubles();
    await expect(
      new RefreshSessionUseCase(d.sesiones, d.issuer, d.events, d.audit).execute(
        { refreshToken: "' OR 1=1 --" },
        trace,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.UNAUTHENTICATED });
    expect(d.sesiones.rotar).not.toHaveBeenCalled();
  });

  it('logout revoca la familia y la publica para invalidar access tokens vivos', async () => {
    const d = doubles();
    d.sesiones.revocarPorToken.mockResolvedValue('fam-9');
    await new LogoutUseCase(d.sesiones, d.events, 1800).execute({ refreshToken: 'b'.repeat(43) }, trace);
    expect(d.events.sessionRevoked).toHaveBeenCalledWith('fam-9', 1800);
  });
});
