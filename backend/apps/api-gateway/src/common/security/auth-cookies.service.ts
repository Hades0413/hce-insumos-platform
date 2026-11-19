import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IssuedTokens } from '@hce/contracts';
import type { CookieOptions, Response } from 'express';
import { COOKIE_NAMES } from './cookies';

/**
 * Política de cookies de sesión (OWASP Session Management):
 * HttpOnly (inaccesible para JS => mitiga robo por XSS), SameSite=Strict
 * (mitiga CSRF), Secure en producción, Path mínimo para el refresh token.
 */
@Injectable()
export class AuthCookiesService {
  private readonly base: CookieOptions;
  private readonly refreshPath: string;

  constructor(config: ConfigService) {
    this.base = {
      httpOnly: true,
      secure: config.get<boolean>('COOKIE_SECURE', true),
      sameSite: 'strict',
      domain: config.get<string>('COOKIE_DOMAIN') || undefined,
    };
    this.refreshPath = `/${config.get<string>('API_PREFIX', 'api/v1')}/auth`;
  }

  setSession(res: Response, tokens: IssuedTokens): void {
    const now = Date.now();
    res.cookie(COOKIE_NAMES.ACCESS, tokens.accessToken, {
      ...this.base,
      path: '/',
      maxAge: Math.max(0, new Date(tokens.accessTokenExpiresAt).getTime() - now),
    });
    res.cookie(COOKIE_NAMES.REFRESH, tokens.refreshToken, {
      ...this.base,
      path: this.refreshPath,
      maxAge: Math.max(0, new Date(tokens.refreshTokenExpiresAt).getTime() - now),
    });
  }

  setCsrf(res: Response, token: string): void {
    res.cookie(COOKIE_NAMES.CSRF, token, { ...this.base, path: '/' });
  }

  clearSession(res: Response): void {
    res.clearCookie(COOKIE_NAMES.ACCESS, { ...this.base, path: '/' });
    res.clearCookie(COOKIE_NAMES.REFRESH, { ...this.base, path: this.refreshPath });
  }
}
