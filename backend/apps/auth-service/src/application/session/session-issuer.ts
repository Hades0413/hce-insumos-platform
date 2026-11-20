import { IssuedTokens, Permiso } from '@hce/contracts';
import { randomUUID } from 'node:crypto';
import { AccessTokenIssuer } from '../../domain/security/access-token-issuer.port';
import { generarRefreshToken } from '../../domain/sesion/refresh-token';
import { SesionRepository } from '../../domain/sesion/sesion.repository.port';
import { InfoCliente } from '../../domain/usuario/info-cliente';
import { Usuario, toUserDto } from '../../domain/usuario/usuario';
import { UsuarioRepository } from '../../domain/usuario/usuario.repository.port';

export class SessionIssuer {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly sesiones: SesionRepository,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly refreshTtlMs: number,
  ) {}

  get accessTtlSeconds(): number {
    return this.accessTokens.ttlSeconds;
  }

  get refreshTtl(): number {
    return this.refreshTtlMs;
  }

  async abrir(usuario: Usuario, cliente: InfoCliente): Promise<IssuedTokens> {
    const familiaId = randomUUID();
    const refresh = generarRefreshToken();
    const expiraEn = new Date(Date.now() + this.refreshTtlMs);
    await this.sesiones.crear(
      { id: refresh.id, idUsuario: usuario.id, familiaId, tokenHash: refresh.hash, expiraEn },
      cliente,
    );
    return this.firmar(usuario, familiaId, refresh.token, expiraEn);
  }

  firmarRotacion(usuario: Usuario, familiaId: string, refreshToken: string, expiraEn: Date): Promise<IssuedTokens> {
    return this.firmar(usuario, familiaId, refreshToken, expiraEn);
  }

  private async firmar(
    usuario: Usuario,
    familiaId: string,
    refreshToken: string,
    expiraEn: Date,
  ): Promise<IssuedTokens> {
    const permisos: Permiso[] = await this.usuarios.permisosEfectivos(usuario.id);
    const access = await this.accessTokens.issue(usuario, familiaId, permisos);
    return {
      user: toUserDto(usuario, permisos),
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: expiraEn.toISOString(),
    };
  }
}
