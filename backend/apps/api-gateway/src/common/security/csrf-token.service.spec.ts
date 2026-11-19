import { ConfigService } from '@nestjs/config';
import { CsrfTokenService } from './csrf-token.service';

describe('CsrfTokenService', () => {
  const svc = new CsrfTokenService({ getOrThrow: () => 'x'.repeat(40) } as unknown as ConfigService);

  it('acepta solo header idéntico a una cookie firmada', () => {
    const token = svc.generate();
    expect(svc.matches(token, token)).toBe(true);
    expect(svc.matches(token, svc.generate())).toBe(false);
    expect(svc.matches(token, undefined)).toBe(false);
  });

  it('rechaza tokens con firma falsificada (cookie tossing)', () => {
    const forged = 'nonce.firmafalsa';
    expect(svc.matches(forged, forged)).toBe(false);
  });
});
