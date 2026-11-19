import MockAdapter from 'axios-mock-adapter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { createHttpClient } from './http-client';

const BASE = 'http://api.test/api/v1';

describe('createHttpClient interceptors', () => {
  let mock: MockAdapter;
  let onSessionExpired: ReturnType<typeof vi.fn<() => void>>;
  let client: ReturnType<typeof createHttpClient>;

  beforeEach(() => {
    onSessionExpired = vi.fn<() => void>();
    client = createHttpClient({ baseURL: BASE, onSessionExpired });
    mock = new MockAdapter(client.instance);
    mock.onGet('/auth/csrf').reply(200, { csrfToken: 'csrf-1' });
  });

  it('agrega X-Request-Id y X-CSRF-Token (solo en métodos inseguros)', async () => {
    mock.onGet('/productos').reply((cfg) => [200, { h: cfg.headers }]);
    mock.onPost('/productos').reply((cfg) => [201, { h: cfg.headers }]);

    const get = await client.instance.get('/productos');
    const post = await client.instance.post('/productos', {});

    expect(get.data.h['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(get.data.h['X-CSRF-Token']).toBeUndefined();
    expect(post.data.h['X-CSRF-Token']).toBe('csrf-1');
  });

  it('obtiene el token CSRF una sola vez para peticiones concurrentes', async () => {
    mock.onPost('/compras').reply(201, {});
    await Promise.all([1, 2, 3].map(() => client.instance.post('/compras', {})));
    expect(mock.history.get?.filter((r) => r.url === '/auth/csrf')).toHaveLength(1);
  });

  it('ante varios 401 simultáneos hace UN solo refresh y reintenta cada petición', async () => {
    let authorized = false;
    mock.onPost('/auth/refresh').reply(() => {
      authorized = true;
      return [200, {}];
    });
    mock.onGet(/\/kardex.*/).reply(() => (authorized ? [200, { ok: true }] : [401, { code: 'UNAUTHENTICATED' }]));

    const results = await Promise.all([
      client.instance.get('/kardex'),
      client.instance.get('/kardex?page=2'),
      client.instance.get('/kardex?page=3'),
    ]);

    expect(results.every((r) => r.data.ok)).toBe(true);
    expect(mock.history.post?.filter((r) => r.url === '/auth/refresh')).toHaveLength(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('si el refresh falla, notifica sesión expirada y propaga ApiError 401', async () => {
    mock.onPost('/auth/refresh').reply(401, { code: 'UNAUTHENTICATED' });
    mock.onGet('/ventas').reply(401, { code: 'UNAUTHENTICATED', detail: 'Token vencido' });

    const err = await client.instance.get('/ventas').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('no intenta refresh para el propio login', async () => {
    mock.onPost('/auth/login').reply(401, { code: 'UNAUTHENTICATED', detail: 'Credenciales inválidas' });
    const err = (await client.instance.post('/auth/login', {}).catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe('Credenciales inválidas');
    expect(mock.history.post?.some((r) => r.url === '/auth/refresh')).toBe(false);
  });

  it('ante 403 CSRF_INVALID renueva el token y reintenta una sola vez', async () => {
    let csrfCalls = 0;
    mock.onGet('/auth/csrf').reply(() => [200, { csrfToken: `csrf-${++csrfCalls}` }]);
    mock
      .onPost('/ventas')
      .reply((cfg) => (cfg.headers?.['X-CSRF-Token'] === 'csrf-2' ? [201, { id: 1 }] : [403, { code: 'CSRF_INVALID' }]));

    const res = await client.instance.post('/ventas', {});
    expect(res.data).toEqual({ id: 1 });
    expect(csrfCalls).toBe(2);
  });

  it('normaliza errores RFC 7807 con errores por campo', async () => {
    mock.onPost('/ventas').reply(422, {
      status: 422,
      code: 'STOCK_INSUFICIENTE',
      detail: 'La cantidad no debe ser mayor al stock',
      errors: [{ field: 'items[0].cantidad', message: 'x', productoId: 3, stockDisponible: 5 }],
      requestId: 'req-1',
    });
    const err = (await client.instance.post('/ventas', {}).catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('STOCK_INSUFICIENTE');
    expect(err.errors[0]?.productoId).toBe(3);
    expect(err.requestId).toBe('req-1');
  });

  it('error de red => NETWORK_ERROR', async () => {
    mock.onGet('/productos').networkError();
    const err = (await client.instance.get('/productos').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('NETWORK_ERROR');
  });
});
