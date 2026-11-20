import { randomBytes } from 'node:crypto';
import { ARGON2ID_V1, PasswordAlgorithm } from './password-algorithms';
import { VersionedPasswordHasher } from './versioned-password-hasher';

describe('VersionedPasswordHasher', () => {
  const hasher = new VersionedPasswordHasher();

  it('hashea con argon2id (v1) y verifica', async () => {
    const stored = await hasher.hash('Una-Clave-De-Prueba-1');
    expect(stored.version).toBe(1);
    await expect(hasher.verify('Una-Clave-De-Prueba-1', stored)).resolves.toBe(true);
    await expect(hasher.verify('otra', stored)).resolves.toBe(false);
  });

  it('agilidad criptográfica: con una estrategia nueva, los hashes v1 siguen verificando y piden re-hash', async () => {
    const v2: PasswordAlgorithm = {
      version: 2,
      newSalt: () => randomBytes(16),
      derive: (plain, salt) => Promise.resolve(Buffer.concat([salt, Buffer.from(plain)])),
    };
    const v1Stored = await hasher.hash('clave');
    const next = new VersionedPasswordHasher(v2, [ARGON2ID_V1]);
    await expect(next.verify('clave', v1Stored)).resolves.toBe(true);
    expect(next.needsRehash(1)).toBe(true);
    expect(next.needsRehash(2)).toBe(false);
  });

  it('salt aleatorio y versión desconocida rechazada', async () => {
    const a = await hasher.hash('x');
    const b = await hasher.hash('x');
    expect(a.hash.equals(b.hash)).toBe(false);
    await expect(hasher.verify('x', { ...a, version: 99 })).resolves.toBe(false);
  });

  it('normaliza Unicode (NFKC)', async () => {
    const stored = await hasher.hash('caf\u00e9');
    await expect(hasher.verify('cafe\u0301', stored)).resolves.toBe(true);
  });
});
