export const ROLES = ['ADMIN', 'ALMACENERO', 'FARMACEUTICO'] as const;
export type Rol = (typeof ROLES)[number];

export interface UserDto {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
}

export interface SessionDto {
  user: UserDto;
  accessTokenExpiresAt: string;
}

/** Claims del access token (ES256, 30 min). */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  name: string;
  rol: Rol;
  jti: string;
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

/** Respuesta interna auth-service -> gateway. Los tokens NUNCA llegan al JS del navegador. */
export interface IssuedTokens {
  user: UserDto;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}
