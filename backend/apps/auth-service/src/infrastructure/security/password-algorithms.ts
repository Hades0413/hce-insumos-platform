import { argon2, randomBytes } from 'node:crypto';

export interface PasswordAlgorithm {
  readonly version: number;
  derive(plain: string, salt: Buffer): Promise<Buffer>;
  newSalt(): Buffer;
}

const normalize = (plain: string) => plain.normalize('NFKC');

export const ARGON2ID_V1: PasswordAlgorithm = {
  version: 1,
  newSalt: () => randomBytes(16),
  derive: (plain, salt) =>
    new Promise((resolve, reject) =>
      argon2(
        'argon2id',
        { message: normalize(plain), nonce: salt, parallelism: 1, tagLength: 32, memory: 19_456, passes: 2 },
        (err, key) => (err ? reject(err) : resolve(key)),
      ),
    ),
};
