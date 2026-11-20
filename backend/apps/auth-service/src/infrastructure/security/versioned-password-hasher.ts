import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { HashedPassword, PasswordHasher } from '../../domain/security/password-hasher.port';
import { ARGON2ID_V1, PasswordAlgorithm } from './password-algorithms';

@Injectable()
export class VersionedPasswordHasher implements PasswordHasher {
  private readonly algorithms: ReadonlyMap<number, PasswordAlgorithm>;

  constructor(
    private readonly current: PasswordAlgorithm = ARGON2ID_V1,
    previous: readonly PasswordAlgorithm[] = [],
  ) {
    this.algorithms = new Map([current, ...previous].map((a) => [a.version, a]));
  }

  async hash(plain: string): Promise<HashedPassword> {
    const salt = this.current.newSalt();
    return { hash: await this.current.derive(plain, salt), salt, version: this.current.version };
  }

  async verify(plain: string, stored: HashedPassword): Promise<boolean> {
    const algorithm = this.algorithms.get(stored.version);
    if (!algorithm) return false;
    const candidate = await algorithm.derive(plain, stored.salt);
    return candidate.length === stored.hash.length && timingSafeEqual(candidate, stored.hash);
  }

  needsRehash(version: number): boolean {
    return version !== this.current.version;
  }

  async dummyVerify(plain: string): Promise<void> {
    await this.current.derive(plain, this.current.newSalt());
  }
}
