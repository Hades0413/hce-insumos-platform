import { ConfigService } from '@nestjs/config';
import { ANONYMOUS_BINDING, CsrfTokenService } from './csrf-token.service';

describe('CsrfTokenService', () => {
  const svc = new CsrfTokenService({ getOrThrow: () => 'x'.repeat(40) } as unknown as ConfigService);

  it('acepta solo header idéntico a una cookie firmada para la misma sesión', () => {
    const token = svc.generate('sid-1');
    expect(svc.matches(token, token, 'sid-1')).toBe(true);
    expect(svc.matches(token, svc.generate('sid-1'), 'sid-1')).toBe(false);
    expect(svc.matches(token, undefined, 'sid-1')).toBe(false);
  });

  it('un token de otra sesión o anónimo no vale para la sesión de la víctima', () => {
    const attacker = svc.generate('sid-atacante');
    const anon = svc.generate(ANONYMOUS_BINDING);
    expect(svc.matches(attacker, attacker, 'sid-victima')).toBe(false);
    expect(svc.matches(anon, anon, 'sid-victima')).toBe(false);
  });

  it('rechaza firmas falsificadas', () => {
    expect(svc.matches('nonce.firmafalsa', 'nonce.firmafalsa', ANONYMOUS_BINDING)).toBe(false);
  });
});
