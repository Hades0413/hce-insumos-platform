export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface HashedPassword {
  readonly hash: Buffer;
  readonly salt: Buffer;
  readonly version: number;
}

export interface PasswordHasher {
  hash(plain: string): Promise<HashedPassword>;
  verify(plain: string, stored: HashedPassword): Promise<boolean>;
  needsRehash(version: number): boolean;
  dummyVerify(plain: string): Promise<void>;
}
