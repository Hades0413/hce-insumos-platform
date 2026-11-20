import { ErrorCode } from '@hce/contracts';
import { MENSAJE_LOGIN_FALLIDO } from '../../../domain/usuario/usuario';
import { LoginUseCase } from './login.use-case';
import { doubles, trace, usuario } from './session.test-doubles';

const fallo = { code: ErrorCode.INVALID_CREDENTIALS, message: MENSAJE_LOGIN_FALLIDO };

function setup() {
  const d = doubles();
  return { ...d, login: new LoginUseCase(d.usuarios, d.hasher, d.issuer, d.audit) };
}

describe('LoginUseCase', () => {
  it('reserva el intento ANTES de verificar y emite access (con sid y permisos) + refresh opaco', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValue(usuario);
    s.hasher.verify.mockResolvedValue(true);
    const tokens = await s.login.execute({ email: ' A@HCE.local ', password: 'x' }, trace);
    expect(s.usuarios.obtenerPorEmail).toHaveBeenCalledWith('a@hce.local');
    expect(s.usuarios.reservarIntento.mock.invocationCallOrder[0]).toBeLessThan(
      s.hasher.verify.mock.invocationCallOrder[0],
    );
    expect(tokens.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokens.user.permisos).toEqual(['ventas.ver']);
    expect(s.tokens.issue.mock.calls[0][1]).toEqual(s.sesiones.crear.mock.calls[0][0].familiaId);
  });

  it('cuenta bloqueada: no verifica la contraseña, hace trabajo dummy y responde igual', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValue(usuario);
    s.usuarios.reservarIntento.mockResolvedValue(false);
    await expect(s.login.execute({ email: usuario.email, password: 'ok' }, trace)).rejects.toMatchObject(fallo);
    expect(s.hasher.verify).not.toHaveBeenCalled();
    expect(s.hasher.dummyVerify).toHaveBeenCalled();
  });

  it('inexistente y contraseña errónea producen exactamente el mismo error (sin enumeración)', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(usuario);
    s.hasher.verify.mockResolvedValue(false);
    const e1 = await s.login.execute({ email: 'x@hce.local', password: 'x' }, trace).catch((e: unknown) => e);
    const e2 = await s.login.execute({ email: usuario.email, password: 'x' }, trace).catch((e: unknown) => e);
    expect(e1).toMatchObject(fallo);
    expect(e2).toMatchObject(fallo);
  });

  it('re-hashea al algoritmo vigente si el hash usa parámetros anteriores', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValue({ ...usuario, hashVersion: 1 });
    s.hasher.verify.mockResolvedValue(true);
    await s.login.execute({ email: usuario.email, password: 'x' }, trace);
    expect(s.usuarios.actualizarHash).toHaveBeenCalledWith('u1', expect.objectContaining({ version: 2 }));
  });
});
