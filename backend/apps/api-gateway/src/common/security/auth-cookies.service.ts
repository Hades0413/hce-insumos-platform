import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IssuedTokens } from '@hce/contracts';
import type { CookieOptions, Response } from 'express';
import { COOKIE_NAMES } from './cookies';

@Injectable()
export class AuthCookiesService {
  private readonly base: CookieOptions;
  private readonly refreshPath: string;

  constructor(config: ConfigService) {
    this.base = {
      httpOnly: true,
      secure: config.get<boolean>('COOKIE_SECURE', true),
      sameSite: 'strict',
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
    const refreshMaxAge = Math.max(0, new Date(tokens.refreshTokenExpiresAt).getTime() - now);
    res.cookie(COOKIE_NAMES.REFRESH, tokens.refreshToken, {
      ...this.base,
      path: this.refreshPath,
      maxAge: refreshMaxAge,
    });
    res.cookie(COOKIE_NAMES.SESSION_HINT, '1', { ...this.base, httpOnly: false, path: '/', maxAge: refreshMaxAge });
  }

  setCsrf(res: Response, token: string): void {
    res.cookie(COOKIE_NAMES.CSRF, token, { ...this.base, path: '/' });
  }

  clearCsrf(res: Response): void {
    res.clearCookie(COOKIE_NAMES.CSRF, { ...this.base, path: '/' });
  }

  clearSession(res: Response): void {
    res.clearCookie(COOKIE_NAMES.ACCESS, { ...this.base, path: '/' });
    res.clearCookie(COOKIE_NAMES.REFRESH, { ...this.base, path: this.refreshPath });
    res.clearCookie(COOKIE_NAMES.SESSION_HINT, { ...this.base, httpOnly: false, path: '/' });
  }
}
