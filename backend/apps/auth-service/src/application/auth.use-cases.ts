import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '@hce/common';
import { ErrorCode, IssuedTokens, LoginRequest, LogoutRequest, RefreshRequest } from '@hce/contracts';
import { randomUUID } from 'node:crypto';
import {
  ACCESS_TOKEN_ISSUER,
  AccessTokenIssuer,
  InfoCliente,
  PASSWORD_HASHER,
  PasswordHasher,
  SESION_REPOSITORY,
  SesionRepository,
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../domain/ports';
import { Usuario, toUserDto } from '../domain/usuario';
import { generarRefreshToken, hashRefreshToken, REFRESH_TOKEN_REGEX } from './refresh-token';

const EMAIL_MAX = 254;
const PASSWORD_MAX = 128; // límite superior: evita DoS con contraseñas gigantes en scrypt

const credencialesInvalidas = () => new AppError(ErrorCode.INVALID_CREDENTIALS, 'Email o contraseña incorrectos.');
const sesionInvalida = () => new AppError(ErrorCode.UNAUTHENTICATED, 'La sesión expiró. Inicie sesión nuevamente.');

/**
 * Casos de uso de identidad. Responsabilidades:
 * - Login con bloqueo progresivo atómico (OWASP ASVS V2.2) y respuesta uniforme
 *   (no revela si el email existe; tiempo constante con dummy hash).
 * - Rotación de refresh tokens con detección de reuso (revoca la familia).
 */
@Injectable()
export class AuthUseCases {
  private readonly logger = new Logger(AuthUseCases.name);
  private readonly refreshTtlMs: number;

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(SESION_REPOSITORY) private readonly sesiones: SesionRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_ISSUER) private readonly accessTokens: AccessTokenIssuer,
    config: ConfigService,
  ) {
    this.refreshTtlMs = Number(config.get('JWT_REFRESH_TTL_HOURS', 8)) * 3_600_000;
  }

  async login(input: LoginRequest): Promise<IssuedTokens> {
    const cliente: InfoCliente = { ip: input.ip, userAgent: input.userAgent };
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!email || email.length > EMAIL_MAX || !password || password.length > PASSWORD_MAX) {
      throw credencialesInvalidas();
    }

    const usuario = await this.usuarios.obtenerPorEmail(email);
    if (!usuario || !usuario.activo) {
      await this.hasher.dummyVerify(password);
      await this.usuarios.registrarIntento(
        email,
        usuario ? 'USUARIO_INACTIVO' : 'USUARIO_NO_EXISTE',
        cliente,
        usuario?.id,
      );
      throw credencialesInvalidas();
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta.getTime() > Date.now()) {
      await this.usuarios.registrarIntento(email, 'CUENTA_BLOQUEADA', cliente, usuario.id);
      throw this.cuentaBloqueada(usuario.bloqueadoHasta);
    }

    const valido = await this.hasher.verify(password, usuario.passwordHash, usuario.passwordSalt);
    if (!valido) {
      const { bloqueadoHasta } = await this.usuarios.registrarLoginFallido(usuario.id, cliente);
      if (bloqueadoHasta && bloqueadoHasta.getTime() > Date.now()) {
        this.logger.warn({ userId: usuario.id, ip: cliente.ip }, 'Cuenta bloqueada por intentos fallidos');
        throw this.cuentaBloqueada(bloqueadoHasta);
      }
      throw credencialesInvalidas();
    }

    await this.usuarios.registrarLoginExitoso(usuario.id, cliente);
    return this.emitir(usuario, randomUUID(), cliente);
  }

  async refresh(input: RefreshRequest): Promise<IssuedTokens> {
    if (typeof input.refreshToken !== 'string' || !REFRESH_TOKEN_REGEX.test(input.refreshToken)) {
      throw sesionInvalida();
    }
    const cliente: InfoCliente = { ip: input.ip, userAgent: input.userAgent };
    const nuevo = generarRefreshToken();
    const expiraEn = new Date(Date.now() + this.refreshTtlMs);
    const resultado = await this.sesiones.rotar(
      hashRefreshToken(input.refreshToken),
      { id: nuevo.id, tokenHash: nuevo.hash, expiraEn },
      cliente,
    );

    switch (resultado.tipo) {
      case 'OK': {
        const access = await this.accessTokens.issue(resultado.usuario);
        return {
          user: toUserDto(resultado.usuario),
          accessToken: access.token,
          accessTokenExpiresAt: access.expiresAt.toISOString(),
          refreshToken: nuevo.token,
          refreshTokenExpiresAt: expiraEn.toISOString(),
        };
      }
      case 'REUTILIZADO':
        this.logger.warn(
          { userId: resultado.idUsuario, ip: cliente.ip },
          'ALERTA: reuso de refresh token rotado; familia de sesiones revocada',
        );
        throw sesionInvalida();
      default:
        throw sesionInvalida();
    }
  }

  async logout(input: LogoutRequest): Promise<void> {
    if (typeof input.refreshToken === 'string' && REFRESH_TOKEN_REGEX.test(input.refreshToken)) {
      await this.sesiones.revocarPorToken(hashRefreshToken(input.refreshToken));
    }
  }

  private async emitir(usuario: Usuario, familiaId: string, cliente: InfoCliente): Promise<IssuedTokens> {
    const refresh = generarRefreshToken();
    const expiraEn = new Date(Date.now() + this.refreshTtlMs);
    await this.sesiones.crear(
      { id: refresh.id, idUsuario: usuario.id, familiaId, tokenHash: refresh.hash, expiraEn },
      cliente,
    );
    const access = await this.accessTokens.issue(usuario);
    return {
      user: toUserDto(usuario),
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.token,
      refreshTokenExpiresAt: expiraEn.toISOString(),
    };
  }

  private cuentaBloqueada(hasta: Date): AppError {
    const minutos = Math.max(1, Math.ceil((hasta.getTime() - Date.now()) / 60_000));
    return new AppError(
      ErrorCode.ACCOUNT_LOCKED,
      `Cuenta bloqueada temporalmente por intentos fallidos. Intente nuevamente en ${minutos} minuto(s).`,
    );
  }
}
