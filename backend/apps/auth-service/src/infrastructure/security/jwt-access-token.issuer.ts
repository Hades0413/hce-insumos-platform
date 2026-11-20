import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenClaims, Permiso } from '@hce/contracts';
import { randomUUID } from 'node:crypto';
import { AccessTokenIssuer } from '../../domain/security/access-token-issuer.port';
import { Usuario } from '../../domain/usuario/usuario';

@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  readonly ttlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    ttlMinutes: number,
  ) {
    this.ttlSeconds = ttlMinutes * 60;
  }

  async issue(usuario: Usuario, sid: string, permisos: Permiso[]): Promise<{ token: string; expiresAt: Date }> {
    const claims: AccessTokenClaims = {
      sub: usuario.id,
      email: usuario.email,
      name: usuario.nombreCompleto,
      rol: usuario.rol,
      sid,
      perms: permisos,
      jti: randomUUID(),
    };
    const token = await this.jwt.signAsync(claims, { expiresIn: this.ttlSeconds });
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000) };
  }
}
