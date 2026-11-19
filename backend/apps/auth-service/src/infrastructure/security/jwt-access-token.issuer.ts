import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenClaims } from '@hce/contracts';
import { randomUUID } from 'node:crypto';
import { AccessTokenIssuer } from '../../domain/ports';
import { Usuario } from '../../domain/usuario';

/**
 * Access token JWT firmado con ES256 (clave PRIVADA solo en auth-service). El
 * gateway verifica con la clave PÚBLICA: aunque se comprometa el gateway, no
 * puede emitir tokens. Vida útil estricta de 30 minutos (requisito).
 */
@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly ttlMinutes: number,
  ) {}

  async issue(usuario: Usuario): Promise<{ token: string; expiresAt: Date }> {
    const claims: AccessTokenClaims = {
      sub: usuario.id,
      email: usuario.email,
      name: usuario.nombreCompleto,
      rol: usuario.rol,
      jti: randomUUID(),
    };
    const token = await this.jwt.signAsync(claims, { expiresIn: this.ttlMinutes * 60 });
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000) };
  }
}
