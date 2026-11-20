import { PermissionsChangedStore } from './permissions-changed.store';

describe('PermissionsChangedStore', () => {
  it('marca obsoletos solo los tokens emitidos antes del cambio', () => {
    const store = new PermissionsChangedStore();
    store.markChanged('u1', 1_000);
    expect(store.isStale('u1', 999, 1_100)).toBe(true);
    expect(store.isStale('u1', 1_001, 1_100)).toBe(false);
    expect(store.isStale('otro', 1, 1_100)).toBe(false);
  });
});
