import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ErrorCode, Rol } from '@hce/contracts';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const PRIVATE_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  NATS_SERVERS: 'nats://127.0.0.1:65530',
  NATS_USER: 'api_gateway',
  NATS_PASSWORD: 'test-password-123456',
  CORS_ORIGINS: 'http://localhost:3000',
  JWT_PUBLIC_KEY: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  COOKIE_SECURE: 'false',
  CSRF_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234',
  METRICS_PORT: '0',
});

const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');
const { configureApp } = require('../src/configure-app') as typeof import('../src/configure-app');
const { AuthFacade } = require('../src/auth/auth.facade') as typeof import('../src/auth/auth.facade');
const { InventarioFacade } =
  require('../src/inventario/inventario.facade') as typeof import('../src/inventario/inventario.facade');

const signer = new JwtService({ privateKey: PRIVATE_PEM, signOptions: { algorithm: 'ES256' } });
const tokenFor = (rol: Rol) =>
  signer.sign(
    { sub: randomUUID(), email: 'u@hce.local', name: 'U', rol, jti: randomUUID() },
    { expiresIn: 1800, issuer: 'hce-auth-service', audience: 'hce-api' },
  );

describe('API Gateway (e2e, seguridad HTTP)', () => {
  let app: INestApplication<App>;
  const inventario = { registrarProducto: jest.fn(), listarProductos: jest.fn(), registrarVenta: jest.fn() };
  const auth = { login: jest.fn() };
  let csrf: string;
  let csrfCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(InventarioFacade)
      .useValue(inventario)
      .overrideProvider(AuthFacade)
      .useValue(auth)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
    configureApp(app as unknown as NestExpressApplication);
    await app.init();

    const res = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
    csrf = (res.body as { csrfToken: string }).csrfToken;
    csrfCookie = `hce_csrf=${csrf}`;
  });

  afterAll(() => app.close());

  it('agrega cabeceras de seguridad (Helmet, nosniff, CSP) y oculta X-Powered-By', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('CORS solo para el origen del front', async () => {
    const ok = await request(app.getHttpServer())
      .options('/api/v1/productos')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');

    const evil = await request(app.getHttpServer())
      .options('/api/v1/productos')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sin sesión -> 401 RFC 7807', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/productos').expect(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ status: 401, code: ErrorCode.UNAUTHENTICATED });
  });

  it('rechaza tokens "alg: none" y firmados con otra clave', async () => {
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
      JSON.stringify({ sub: 'x', rol: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 600 }),
    ).toString('base64url')}.`;
    await request(app.getHttpServer()).get('/api/v1/productos').set('Cookie', `hce_at=${none}`).expect(401);

    const other = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    });
    const forged = new JwtService({ privateKey: other.toString(), signOptions: { algorithm: 'ES256' } }).sign(
      { sub: 'x', rol: 'ADMIN' },
      { issuer: 'hce-auth-service', audience: 'hce-api' },
    );
    await request(app.getHttpServer()).get('/api/v1/productos').set('Cookie', `hce_at=${forged}`).expect(401);
  });

  it('escritura sin CSRF -> 403 CSRF_INVALID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Cookie', `hce_at=${tokenFor('ADMIN')}`)
      .send({ nombre: 'Prod', nroLote: 'L1' })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.CSRF_INVALID);
  });

  it('RBAC: ALMACENERO registra producto; FARMACEUTICO no', async () => {
    inventario.registrarProducto.mockResolvedValue({ id: 1 });
    await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Cookie', [`hce_at=${tokenFor('ALMACENERO')}`, csrfCookie])
      .set('X-CSRF-Token', csrf)
      .send({ nombre: 'Prod', nroLote: 'L1', costo: 1.5 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Cookie', [`hce_at=${tokenFor('FARMACEUTICO')}`, csrfCookie])
      .set('X-CSRF-Token', csrf)
      .send({ nombre: 'Prod', nroLote: 'L1' })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('valida entrada estricta: campos extra y tipos inválidos -> 400 con errores por campo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Cookie', [`hce_at=${tokenFor('ADMIN')}`, csrfCookie])
      .set('X-CSRF-Token', csrf)
      .send({ nombre: 'Prod', nroLote: 'L1', costo: 1.234, rol: 'ADMIN' })
      .expect(400);
    const fields = (res.body.errors as { field: string }[]).map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['rol', 'costo']));
  });

  it('POST /ventas exige Idempotency-Key UUID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ventas')
      .set('Cookie', [`hce_at=${tokenFor('FARMACEUTICO')}`, csrfCookie])
      .set('X-CSRF-Token', csrf)
      .send({ items: [{ productoId: 1, cantidad: 1 }] })
      .expect(400);
    expect(res.body.errors[0].field).toBe('Idempotency-Key');
  });

  it('login emite cookies HttpOnly + SameSite=Strict y no devuelve tokens en el body', async () => {
    auth.login.mockResolvedValue({
      user: { id: '1', email: 'a@hce.local', nombreCompleto: 'A', rol: 'ADMIN' },
      accessToken: 'AT',
      accessTokenExpiresAt: new Date(Date.now() + 1_800_000).toISOString(),
      refreshToken: 'RT',
      refreshTokenExpiresAt: new Date(Date.now() + 28_800_000).toISOString(),
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrf)
      .send({ email: 'a@hce.local', password: 'x' })
      .expect(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    expect(cookies.find((c) => c.startsWith('hce_at='))).toMatch(/HttpOnly.*SameSite=Strict|SameSite=Strict.*HttpOnly/);
    expect(cookies.find((c) => c.startsWith('hce_rt='))).toContain('Path=/api/v1/auth');
    expect(JSON.stringify(res.body)).not.toContain('AT"');
    expect(res.body).not.toHaveProperty('accessToken');
  });
});
