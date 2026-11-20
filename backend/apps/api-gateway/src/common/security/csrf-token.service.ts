import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ANONYMOUS_BINDING = 'anon';

@Injectable()
export class CsrfTokenService {
  private readonly secret: Buffer;

  constructor(config: ConfigService) {
    this.secret = Buffer.from(config.getOrThrow<string>('CSRF_SECRET'), 'utf8');
  }

  generate(binding: string): string {
    const nonce = randomBytes(32).toString('base64url');
    return `${nonce}.${this.sign(nonce, binding)}`;
  }

  isValid(token: unknown, binding: string): token is string {
    if (typeof token !== 'string' || token.length > 200) return false;
    const [nonce, signature, extra] = token.split('.');
    if (!nonce || !signature || extra !== undefined) return false;
    return safeEqual(this.sign(nonce, binding), signature);
  }

  matches(cookieToken: unknown, headerToken: unknown, binding: string): boolean {
    return this.isValid(cookieToken, binding) && typeof headerToken === 'string' && safeEqual(cookieToken, headerToken);
  }

  private sign(nonce: string, binding: string): string {
    return createHmac('sha256', this.secret).update(`${nonce}|${binding}`).digest('base64url');
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
