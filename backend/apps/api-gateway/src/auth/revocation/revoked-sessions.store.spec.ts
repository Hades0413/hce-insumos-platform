import { RevokedSessionsStore } from './revoked-sessions.store';

describe('RevokedSessionsStore', () => {
  it('revoca hasta que vence el TTL del access token', () => {
    const store = new RevokedSessionsStore();
    store.revoke('s1', 60, 0);
    expect(store.isRevoked('s1', 59_000)).toBe(true);
    expect(store.isRevoked('s1', 60_000)).toBe(false);
    expect(store.isRevoked('otra', 0)).toBe(false);
    expect(store.isRevoked(undefined, 0)).toBe(false);
  });
});
