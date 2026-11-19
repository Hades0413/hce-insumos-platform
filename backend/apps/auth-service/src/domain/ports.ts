import { Rol } from '@hce/contracts';
import { Usuario, UsuarioConCredenciales } from './usuario';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');
export const SESION_REPOSITORY = Symbol('SESION_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const ACCESS_TOKEN_ISSUER = Symbol('ACCESS_TOKEN_ISSUER');

export interface InfoCliente {
  readonly ip?: string;
  readonly userAgent?: string;
}

export interface UsuarioRepository {
  contar(): Promise<number>;
  crear(data: { email: string; nombreCompleto: string; hash: Buffer; salt: Buffer; rol: Rol }): Promise<Usuario>;
  obtenerPorEmail(email: string): Promise<UsuarioConCredenciales | null>;
  registrarLoginFallido(id: string, cliente: InfoCliente): Promise<{ bloqueadoHasta: Date | null }>;
  registrarLoginExitoso(id: string, cliente: InfoCliente): Promise<void>;
  registrarIntento(email: string, motivo: string, cliente: InfoCliente, idUsuario?: string): Promise<void>;
}

export type ResultadoRotacion =
  | { readonly tipo: 'OK'; readonly usuario: Usuario }
  | { readonly tipo: 'INVALIDO' | 'EXPIRADO' | 'USUARIO_INACTIVO' }
  | { readonly tipo: 'REUTILIZADO'; readonly idUsuario?: string };

export interface NuevaSesion {
  readonly id: string;
  readonly idUsuario: string;
  readonly familiaId: string;
  readonly tokenHash: Buffer;
  readonly expiraEn: Date;
}

export interface SesionRepository {
  crear(sesion: NuevaSesion, cliente: InfoCliente): Promise<void>;
  rotar(
    tokenHashActual: Buffer,
    nueva: Omit<NuevaSesion, 'idUsuario' | 'familiaId'>,
    cliente: InfoCliente,
  ): Promise<ResultadoRotacion>;
  revocarPorToken(tokenHash: Buffer): Promise<void>;
  purgarExpiradas(): Promise<number>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<{ hash: Buffer; salt: Buffer }>;
  verify(plain: string, hash: Buffer, salt: Buffer): Promise<boolean>;
  /** Trabajo equivalente a verify() para usuarios inexistentes (evita enumeración por tiempo). */
  dummyVerify(plain: string): Promise<void>;
}

export interface AccessTokenIssuer {
  issue(usuario: Usuario): Promise<{ token: string; expiresAt: Date }>;
}
