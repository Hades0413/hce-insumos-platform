import type { Permiso } from './permissions';

export const ROLES = ['ADMIN', 'ALMACENERO', 'FARMACEUTICO'] as const;
export type Rol = (typeof ROLES)[number];

export interface UserDto {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  permisos: Permiso[];
}

export interface SessionDto {
  user: UserDto;
  accessTokenExpiresAt: string;
}

export interface AccessTokenClaims {
  sub: string;
  email: string;
  name: string;
  rol: Rol;
  sid: string;
  perms: Permiso[];
  jti: string;
}

export interface SessionRevokedEvent {
  sid: string;
  ttlSeconds: number;
}

export interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

export interface LoginRequest extends ClientInfo {
  email: string;
  password: string;
}

export interface RefreshRequest extends ClientInfo {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface IssuedTokens {
  user: UserDto;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}
