import { SessionEventsPublisher } from '../../../domain/events/session-events.port';
import { AccessTokenIssuer } from '../../../domain/security/access-token-issuer.port';
import { PasswordHasher } from '../../../domain/security/password-hasher.port';
import { SecurityAudit } from '../../../domain/security/security-audit.port';
import { SesionRepository } from '../../../domain/sesion/sesion.repository.port';
import { UsuarioConCredenciales } from '../../../domain/usuario/usuario';
import { UsuarioRepository } from '../../../domain/usuario/usuario.repository.port';
import { SessionIssuer } from '../../session/session-issuer';

export const usuario: UsuarioConCredenciales = {
  id: 'u1',
  email: 'a@hce.local',
  nombreCompleto: 'A',
  rol: 'ADMIN',
  activo: true,
  passwordHash: Buffer.alloc(32),
  passwordSalt: Buffer.alloc(16),
  hashVersion: 1,
};

export function doubles() {
  const usuarios: jest.Mocked<UsuarioRepository> = {
    contar: jest.fn(),
    crear: jest.fn(),
    obtenerPorEmail: jest.fn(),
    reservarIntento: jest.fn().mockResolvedValue(true),
    registrarLoginExitoso: jest.fn(),
    registrarIntento: jest.fn(),
    actualizarHash: jest.fn(),
    permisosEfectivos: jest.fn().mockResolvedValue(['ventas.ver']),
  };
  const sesiones: jest.Mocked<SesionRepository> = {
    crear: jest.fn(),
    rotar: jest.fn(),
    revocarPorToken: jest.fn(),
    purgarExpiradas: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn().mockResolvedValue({ hash: Buffer.alloc(32), salt: Buffer.alloc(16), version: 2 }),
    verify: jest.fn(),
    needsRehash: jest.fn((v: number) => v !== 2),
    dummyVerify: jest.fn(),
  };
  const tokens: jest.Mocked<AccessTokenIssuer> = {
    ttlSeconds: 1800,
    issue: jest.fn().mockResolvedValue({ token: 'jwt', expiresAt: new Date(Date.now() + 1_800_000) }),
  };
  const events: jest.Mocked<SessionEventsPublisher> = { sessionRevoked: jest.fn(), permissionsChanged: jest.fn() };
  const audit: jest.Mocked<SecurityAudit> = { alert: jest.fn(), info: jest.fn() };
  const issuer = new SessionIssuer(usuarios, sesiones, tokens, 8 * 3_600_000);
  return { usuarios, sesiones, hasher, tokens, events, audit, issuer };
}

export const trace = { requestId: 'req-1' };
