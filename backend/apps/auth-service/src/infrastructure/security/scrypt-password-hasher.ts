import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCb, ScryptOptions, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from '../../domain/ports';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** OWASP Password Storage Cheat Sheet: scrypt N=2^17,r=8,p=1 (≈128 MiB). Se usa N=2^15 por
 *  presupuesto de memoria en contenedores pequeños; parametrizable si se versiona el hash. */
const PARAMS: ScryptOptions = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** scrypt ASÍNCRONO (threadpool de libuv): no bloquea el event loop bajo carga de logins. */
function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize('NFKC'), salt, KEY_LENGTH, PARAMS, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  private readonly dummySalt = randomBytes(SALT_LENGTH);

  async hash(plain: string): Promise<{ hash: Buffer; salt: Buffer }> {
    const salt = randomBytes(SALT_LENGTH);
    return { hash: await scrypt(plain, salt), salt };
  }

  async verify(plain: string, hash: Buffer, salt: Buffer): Promise<boolean> {
    const candidate = await scrypt(plain, salt);
    return candidate.length === hash.length && timingSafeEqual(candidate, hash);
  }

  async dummyVerify(plain: string): Promise<void> {
    await scrypt(plain, this.dummySalt);
  }
}
