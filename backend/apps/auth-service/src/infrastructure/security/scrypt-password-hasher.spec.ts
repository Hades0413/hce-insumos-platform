import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const { hash, salt } = await hasher.hash('Hce.Demo.2026!');
    await expect(hasher.verify('Hce.Demo.2026!', hash, salt)).resolves.toBe(true);
    await expect(hasher.verify('otra', hash, salt)).resolves.toBe(false);
  });

  it('usa salt aleatorio (mismo password => hash distinto)', async () => {
    const a = await hasher.hash('x');
    const b = await hasher.hash('x');
    expect(a.hash.equals(b.hash)).toBe(false);
  });
});
