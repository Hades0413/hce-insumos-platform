import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * CSRF "signed double-submit cookie" (OWASP CSRF Cheat Sheet):
 *  token = nonce.HMAC(secret, nonce). Se guarda en cookie HttpOnly y el front
 *  lo reenvía en el header X-CSRF-Token (lo obtiene de GET /auth/csrf; un sitio
 *  atacante no puede leer esa respuesta por CORS). La firma impide que un
 *  subdominio comprometido "plante" una cookie con un valor elegido.
 *  Complementa SameSite=Strict (defensa en profundidad).
 */
@Injectable()
export class CsrfTokenService {
  private readonly secret: Buffer;

  constructor(config: ConfigService) {
    this.secret = Buffer.from(config.getOrThrow<string>('CSRF_SECRET'), 'utf8');
  }

  generate(): string {
    const nonce = randomBytes(32).toString('base64url');
    return `${nonce}.${this.sign(nonce)}`;
  }

  isValid(token: unknown): token is string {
    if (typeof token !== 'string' || token.length > 200) return false;
    const [nonce, signature, extra] = token.split('.');
    if (!nonce || !signature || extra !== undefined) return false;
    return safeEqual(this.sign(nonce), signature);
  }

  matches(cookieToken: unknown, headerToken: unknown): boolean {
    return this.isValid(cookieToken) && typeof headerToken === 'string' && safeEqual(cookieToken, headerToken);
  }

  private sign(nonce: string): string {
    return createHmac('sha256', this.secret).update(nonce).digest('base64url');
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
