import { ErrorCode, IssuedTokens, LoginRequest, TraceContext } from '@hce/contracts';
import { AppError, UseCase } from '@hce/core';
import { PasswordHasher } from '../../../domain/security/password-hasher.port';
import { SecurityAudit } from '../../../domain/security/security-audit.port';
import { InfoCliente } from '../../../domain/usuario/info-cliente';
import { MENSAJE_LOGIN_FALLIDO, UsuarioConCredenciales } from '../../../domain/usuario/usuario';
import { UsuarioRepository } from '../../../domain/usuario/usuario.repository.port';
import { SessionIssuer } from '../../session/session-issuer';

const EMAIL_MAX = 254;
const PASSWORD_MAX = 128;

const loginFallido = () => new AppError(ErrorCode.INVALID_CREDENTIALS, MENSAJE_LOGIN_FALLIDO);

export class LoginUseCase implements UseCase<LoginRequest, IssuedTokens, TraceContext> {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionIssuer,
    private readonly audit: SecurityAudit,
  ) {}

  async execute(input: LoginRequest, _ctx?: TraceContext): Promise<IssuedTokens> {
    const cliente: InfoCliente = { ip: input?.ip, userAgent: input?.userAgent };
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!email || email.length > EMAIL_MAX || !password || password.length > PASSWORD_MAX) throw loginFallido();

    const usuario = await this.usuarios.obtenerPorEmail(email);
    if (!usuario) {
      await this.hasher.dummyVerify(password);
      await this.usuarios.registrarIntento(email, 'USUARIO_NO_EXISTE', cliente);
      throw loginFallido();
    }

    if (!(await this.usuarios.reservarIntento(usuario.id, cliente))) {
      await this.hasher.dummyVerify(password);
      throw loginFallido();
    }

    const stored = { hash: usuario.passwordHash, salt: usuario.passwordSalt, version: usuario.hashVersion };
    if (!(await this.hasher.verify(password, stored))) {
      await this.usuarios.registrarIntento(email, 'CREDENCIALES_INVALIDAS', cliente, usuario.id);
      throw loginFallido();
    }

    await this.usuarios.registrarLoginExitoso(usuario.id, cliente);
    await this.rehashSiCorresponde(usuario, password);
    return this.sessions.abrir(usuario, cliente);
  }

  private async rehashSiCorresponde(usuario: UsuarioConCredenciales, password: string): Promise<void> {
    if (!this.hasher.needsRehash(usuario.hashVersion)) return;
    try {
      await this.usuarios.actualizarHash(usuario.id, await this.hasher.hash(password));
      this.audit.info('password.rehashed', { userId: usuario.id });
    } catch (error: unknown) {
      this.audit.alert('password.rehash_failed', { userId: usuario.id, err: (error as Error).message });
    }
  }
}
