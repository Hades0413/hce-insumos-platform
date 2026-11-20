import { sanitize } from './sanitize-input.middleware';

describe('sanitize (middleware de entrada)', () => {
  const run = (v: unknown) => sanitize(v, 0, { keys: 0 }, 'body');

  it('elimina caracteres de control/bidi y normaliza a NFC', () => {
    expect(run({ nombre: 'Paracetamol\u0000 500‮ mg' })).toEqual({ nombre: 'Paracetamol 500 mg' });
    expect(run('café')).toBe('café');
  });

  it('rechaza prototype pollution', () => {
    expect(() => run(JSON.parse('{"__proto__": {"admin": true}}'))).toThrow();
    expect(() => run({ a: { constructor: { prototype: 1 } } })).toThrow();
  });

  it('acota profundidad y longitud', () => {
    let deep: unknown = 'x';
    for (let i = 0; i < 20; i++) deep = { n: deep };
    expect(() => run(deep)).toThrow();
    expect(() => run('a'.repeat(10_001))).toThrow();
  });

  it('conserva números, booleanos y arrays', () => {
    expect(run({ items: [{ productoId: 1, cantidad: 2 }], ok: true })).toEqual({
      items: [{ productoId: 1, cantidad: 2 }],
      ok: true,
    });
  });
});
