import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@hce/contracts';
import { AccessTokenIssuer, PasswordHasher, SesionRepository, UsuarioRepository } from '../domain/ports';
import { UsuarioConCredenciales } from '../domain/usuario';
import { AuthUseCases } from './auth.use-cases';

const usuario: UsuarioConCredenciales = {
  id: 'u1',
  email: 'a@hce.local',
  nombreCompleto: 'A',
  rol: 'ADMIN',
  activo: true,
  passwordHash: Buffer.alloc(64),
  passwordSalt: Buffer.alloc(16),
  bloqueadoHasta: null,
};

function setup() {
  const usuarios: jest.Mocked<UsuarioRepository> = {
    contar: jest.fn(),
    crear: jest.fn(),
    obtenerPorEmail: jest.fn(),
    registrarLoginFallido: jest.fn(),
    registrarLoginExitoso: jest.fn(),
    registrarIntento: jest.fn(),
  };
  const sesiones: jest.Mocked<SesionRepository> = {
    crear: jest.fn(),
    rotar: jest.fn(),
    revocarPorToken: jest.fn(),
    purgarExpiradas: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasher> = { hash: jest.fn(), verify: jest.fn(), dummyVerify: jest.fn() };
  const issuer: jest.Mocked<AccessTokenIssuer> = {
    issue: jest.fn().mockResolvedValue({ token: 'jwt', expiresAt: new Date(Date.now() + 1_800_000) }),
  };
  const config = { get: jest.fn().mockReturnValue(8) } as unknown as ConfigService;
  return { usuarios, sesiones, hasher, issuer, auth: new AuthUseCases(usuarios, sesiones, hasher, issuer, config) };
}

describe('AuthUseCases', () => {
  it('login correcto emite access + refresh y registra el éxito', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValue(usuario);
    s.hasher.verify.mockResolvedValue(true);
    const tokens = await s.auth.login({ email: ' A@HCE.local ', password: 'x' });
    expect(s.usuarios.obtenerPorEmail).toHaveBeenCalledWith('a@hce.local');
    expect(tokens.accessToken).toBe('jwt');
    expect(tokens.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(s.sesiones.crear).toHaveBeenCalled();
  });

  it('usuario inexistente: mismo error que contraseña incorrecta y hash dummy (anti-enumeración)', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValue(null);
    await expect(s.auth.login({ email: 'x@hce.local', password: 'x' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_CREDENTIALS,
    });
    expect(s.hasher.dummyVerify).toHaveBeenCalled();
  });

  it('al alcanzar el máximo de intentos responde ACCOUNT_LOCKED', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValue(usuario);
    s.hasher.verify.mockResolvedValue(false);
    s.usuarios.registrarLoginFallido.mockResolvedValue({ bloqueadoHasta: new Date(Date.now() + 900_000) });
    await expect(s.auth.login({ email: usuario.email, password: 'bad' })).rejects.toMatchObject({
      code: ErrorCode.ACCOUNT_LOCKED,
    });
  });

  it('cuenta bloqueada no verifica la contraseña', async () => {
    const s = setup();
    s.usuarios.obtenerPorEmail.mockResolvedValue({ ...usuario, bloqueadoHasta: new Date(Date.now() + 60_000) });
    await expect(s.auth.login({ email: usuario.email, password: 'ok' })).rejects.toMatchObject({
      code: ErrorCode.ACCOUNT_LOCKED,
    });
    expect(s.hasher.verify).not.toHaveBeenCalled();
  });

  it('reuso de refresh token rotado -> UNAUTHENTICATED', async () => {
    const s = setup();
    s.sesiones.rotar.mockResolvedValue({ tipo: 'REUTILIZADO', idUsuario: 'u1' });
    await expect(s.auth.refresh({ refreshToken: 'a'.repeat(43) })).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });
  });

  it('refresh token con formato inválido no consulta la BD', async () => {
    const s = setup();
    await expect(s.auth.refresh({ refreshToken: "' OR 1=1 --" })).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });
    expect(s.sesiones.rotar).not.toHaveBeenCalled();
  });
});
