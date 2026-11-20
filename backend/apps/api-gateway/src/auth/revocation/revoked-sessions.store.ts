import { Injectable } from '@nestjs/common';

const MAX_ENTRIES = 100_000;

@Injectable()
export class RevokedSessionsStore {
  private readonly revoked = new Map<string, number>();

  revoke(sid: string, ttlSeconds: number, now = Date.now()): void {
    if (!sid || ttlSeconds <= 0) return;
    if (this.revoked.size >= MAX_ENTRIES) this.evictExpired(now);
    if (this.revoked.size >= MAX_ENTRIES) {
      const oldest = this.revoked.keys().next().value;
      if (oldest !== undefined) this.revoked.delete(oldest);
    }
    this.revoked.set(sid, now + ttlSeconds * 1000);
  }

  isRevoked(sid: string | undefined, now = Date.now()): boolean {
    if (!sid) return false;
    const until = this.revoked.get(sid);
    if (until === undefined) return false;
    if (until <= now) {
      this.revoked.delete(sid);
      return false;
    }
    return true;
  }

  private evictExpired(now: number): void {
    for (const [sid, until] of this.revoked) if (until <= now) this.revoked.delete(sid);
  }
}
