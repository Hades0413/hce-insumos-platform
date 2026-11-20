import { Permiso } from '@hce/contracts';
import { Usuario } from '../usuario/usuario';

export const ACCESS_TOKEN_ISSUER = Symbol('ACCESS_TOKEN_ISSUER');

export interface AccessTokenIssuer {
  issue(usuario: Usuario, sid: string, permisos: Permiso[]): Promise<{ token: string; expiresAt: Date }>;
  readonly ttlSeconds: number;
}
