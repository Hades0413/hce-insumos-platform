import { describe, expect, it } from 'vitest';
import { safeNextPath } from './navigation';

describe('safeNextPath (anti open-redirect)', () => {
  it.each([
    '//evil.com',
    '/\\evil.com',
    '/.//evil.com',
    '/x/..//evil.com',
    '/./\\evil.com',
    '/%2e%2e//evil.com',
    '/%2e//evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '/\tevil',
    '/\n//evil.com',
    ' /compras',
    '',
    'compras',
    `/${'a'.repeat(600)}`,
  ])('rechaza %j', (payload) => {
    expect(safeNextPath(payload)).toBe('/');
  });

  it.each([
    ['/compras', '/compras'],
    ['/ventas/historial?page=2', '/ventas/historial?page=2'],
    ['/kardex#movimientos', '/kardex#movimientos'],
    ['/compras/../ventas', '/ventas'],
  ])('acepta rutas internas %j', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it('el resultado nunca es protocol-relative', () => {
    for (const p of ['/.//a', '/a/..//b', '/..//c', '/%2F/evil.com']) {
      expect(safeNextPath(p).startsWith('//')).toBe(false);
    }
  });
});
