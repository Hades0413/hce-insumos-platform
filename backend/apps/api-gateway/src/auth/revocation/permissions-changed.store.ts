import { Injectable } from '@nestjs/common';

const MAX_ENTRIES = 100_000;
const RETENTION_SECONDS = 3_600;

@Injectable()
export class PermissionsChangedStore {
  private readonly changes = new Map<string, number>();

  markChanged(userId: string, changedAt: number): void {
    if (this.changes.size >= MAX_ENTRIES) this.evict(Math.floor(Date.now() / 1000));
    this.changes.set(userId, Math.max(changedAt, this.changes.get(userId) ?? 0));
  }

  isStale(userId: string, issuedAt: number, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    const changedAt = this.changes.get(userId);
    if (changedAt === undefined) return false;
    if (changedAt + RETENTION_SECONDS < nowSeconds) {
      this.changes.delete(userId);
      return false;
    }
    return issuedAt <= changedAt;
  }

  private evict(now: number): void {
    for (const [id, at] of this.changes) if (at + RETENTION_SECONDS < now) this.changes.delete(id);
  }
}
