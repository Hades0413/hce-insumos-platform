import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ClientsModule } from '@nestjs/microservices';
import {
  buildLoggerParams,
  MssqlModule,
  natsClientOptions,
  operationObserverProvider,
  provideUseCase,
  splitCsv,
} from '@hce/common';
import { LoggerModule } from 'nestjs-pino';
import { USE_CASES } from './application/ports/tokens';
import { SessionIssuer } from './application/session/session-issuer';
import {
  ListarPermisosUseCase,
  ListarRolesUseCase,
  ListarUsuariosUseCase,
  ObtenerPermisosUsuarioUseCase,
} from './application/use-cases/seguridad/consultas-seguridad.use-cases';
import { EliminarExcepcionUseCase } from './application/use-cases/seguridad/eliminar-excepcion.use-case';
import { GuardarExcepcionUseCase } from './application/use-cases/seguridad/guardar-excepcion.use-case';
import { LoginUseCase } from './application/use-cases/session/login.use-case';
import { LogoutUseCase } from './application/use-cases/session/logout.use-case';
import { RefreshSessionUseCase } from './application/use-cases/session/refresh-session.use-case';
import { SESSION_EVENTS, SessionEventsPublisher } from './domain/events/session-events.port';
import { PERMISOS_REPOSITORY, PermisosRepository } from './domain/permisos/permisos.repository.port';
import { ACCESS_TOKEN_ISSUER, AccessTokenIssuer } from './domain/security/access-token-issuer.port';
import { PASSWORD_HASHER, PasswordHasher } from './domain/security/password-hasher.port';
import { SECURITY_AUDIT, SecurityAudit } from './domain/security/security-audit.port';
import { SESION_REPOSITORY, SesionRepository } from './domain/sesion/sesion.repository.port';
import { USUARIO_REPOSITORY, UsuarioRepository } from './domain/usuario/usuario.repository.port';
import { SeedDemoUsers } from './infrastructure/bootstrap/seed-demo-users';
import { authEnvSchema, decodePem } from './infrastructure/config/auth.config';
import { NestSecurityAudit } from './infrastructure/logging/nest-security-audit';
import { AdminNatsController } from './infrastructure/messaging/admin.nats-controller';
import { AuthNatsController } from './infrastructure/messaging/auth.nats-controller';
import {
  AUTH_EVENTS_CLIENT,
  NatsSessionEventsPublisher,
} from './infrastructure/messaging/nats-session-events.publisher';
import { MssqlPermisosRepository } from './infrastructure/persistence/mssql-permisos.repository';
import { MssqlSesionRepository } from './infrastructure/persistence/mssql-sesion.repository';
import { MssqlUsuarioRepository } from './infrastructure/persistence/mssql-usuario.repository';
import { JwtAccessTokenIssuer } from './infrastructure/security/jwt-access-token.issuer';
import { VersionedPasswordHasher } from './infrastructure/security/versioned-password-hasher';

const SESSION_ISSUER = Symbol('SESSION_ISSUER');

const adapters: Provider[] = [
  { provide: USUARIO_REPOSITORY, useClass: MssqlUsuarioRepository },
  { provide: SESION_REPOSITORY, useClass: MssqlSesionRepository },
  { provide: PERMISOS_REPOSITORY, useClass: MssqlPermisosRepository },
  { provide: PASSWORD_HASHER, useFactory: () => new VersionedPasswordHasher() },
  { provide: SESSION_EVENTS, useClass: NatsSessionEventsPublisher },
  { provide: SECURITY_AUDIT, useClass: NestSecurityAudit },
  {
    provide: ACCESS_TOKEN_ISSUER,
    inject: [JwtService, ConfigService],
    useFactory: (jwt: JwtService, c: ConfigService) =>
      new JwtAccessTokenIssuer(jwt, c.get<number>('JWT_ACCESS_TTL_MIN', 30)),
  },
  {
    provide: SESSION_ISSUER,
    inject: [USUARIO_REPOSITORY, SESION_REPOSITORY, ACCESS_TOKEN_ISSUER, ConfigService],
    useFactory: (u: UsuarioRepository, s: SesionRepository, t: AccessTokenIssuer, c: ConfigService) =>
      new SessionIssuer(u, s, t, Number(c.get('JWT_REFRESH_TTL_HOURS', 8)) * 3_600_000),
  },
];

const useCases: Provider[] = [
  provideUseCase(
    USE_CASES.LOGIN,
    'Login',
    (u: UsuarioRepository, h: PasswordHasher, si: SessionIssuer, a: SecurityAudit) => new LoginUseCase(u, h, si, a),
    [USUARIO_REPOSITORY, PASSWORD_HASHER, SESSION_ISSUER, SECURITY_AUDIT],
  ),
  provideUseCase(
    USE_CASES.REFRESH_SESSION,
    'RefreshSession',
    (s: SesionRepository, si: SessionIssuer, e: SessionEventsPublisher, a: SecurityAudit) =>
      new RefreshSessionUseCase(s, si, e, a),
    [SESION_REPOSITORY, SESSION_ISSUER, SESSION_EVENTS, SECURITY_AUDIT],
  ),
  provideUseCase(
    USE_CASES.LOGOUT,
    'Logout',
    (s: SesionRepository, e: SessionEventsPublisher, t: AccessTokenIssuer) => new LogoutUseCase(s, e, t.ttlSeconds),
    [SESION_REPOSITORY, SESSION_EVENTS, ACCESS_TOKEN_ISSUER],
  ),
  provideUseCase(
    USE_CASES.LISTAR_PERMISOS,
    'ListarPermisos',
    (r: PermisosRepository) => new ListarPermisosUseCase(r),
    [PERMISOS_REPOSITORY],
    'seguridad.administrar',
  ),
  provideUseCase(
    USE_CASES.LISTAR_ROLES,
    'ListarRoles',
    (r: PermisosRepository) => new ListarRolesUseCase(r),
    [PERMISOS_REPOSITORY],
    'seguridad.administrar',
  ),
  provideUseCase(
    USE_CASES.LISTAR_USUARIOS,
    'ListarUsuarios',
    (r: PermisosRepository) => new ListarUsuariosUseCase(r),
    [PERMISOS_REPOSITORY],
    'seguridad.administrar',
  ),
  provideUseCase(
    USE_CASES.OBTENER_PERMISOS_USUARIO,
    'ObtenerPermisosUsuario',
    (r: PermisosRepository) => new ObtenerPermisosUsuarioUseCase(r),
    [PERMISOS_REPOSITORY],
    'seguridad.administrar',
  ),
  provideUseCase(
    USE_CASES.GUARDAR_EXCEPCION,
    'GuardarExcepcion',
    (r: PermisosRepository, e: SessionEventsPublisher, a: SecurityAudit) => new GuardarExcepcionUseCase(r, e, a),
    [PERMISOS_REPOSITORY, SESSION_EVENTS, SECURITY_AUDIT],
    'seguridad.administrar',
  ),
  provideUseCase(
    USE_CASES.ELIMINAR_EXCEPCION,
    'EliminarExcepcion',
    (r: PermisosRepository, e: SessionEventsPublisher, a: SecurityAudit) => new EliminarExcepcionUseCase(r, e, a),
    [PERMISOS_REPOSITORY, SESSION_EVENTS, SECURITY_AUDIT],
    'seguridad.administrar',
  ),
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: authEnvSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) =>
        buildLoggerParams('auth-service', c.get<string>('LOG_LEVEL', 'info'), c.get<boolean>('LOG_PRETTY', false)),
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        privateKey: decodePem(c.getOrThrow<string>('JWT_PRIVATE_KEY')),
        signOptions: {
          algorithm: 'ES256',
          issuer: c.get<string>('JWT_ISSUER'),
          audience: c.get<string>('JWT_AUDIENCE'),
        },
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: AUTH_EVENTS_CLIENT,
        inject: [ConfigService],
        useFactory: (c: ConfigService) =>
          natsClientOptions(
            AUTH_EVENTS_CLIENT,
            {
              servers: splitCsv(c.getOrThrow<string>('NATS_SERVERS')),
              user: c.getOrThrow<string>('NATS_USER'),
              pass: c.getOrThrow<string>('NATS_PASSWORD'),
              tlsCaFile: c.get<string>('NATS_TLS_CA_FILE'),
            },
            'auth-service:events',
          ),
      },
    ]),
    MssqlModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        server: c.getOrThrow<string>('DB_HOST'),
        port: c.get<number>('DB_PORT', 1433),
        database: c.getOrThrow<string>('DB_NAME'),
        user: c.getOrThrow<string>('DB_USER'),
        password: c.getOrThrow<string>('DB_PASSWORD'),
        encrypt: c.get<boolean>('DB_ENCRYPT', true),
        trustServerCertificate: c.get<boolean>('DB_TRUST_SERVER_CERT', false),
        poolMax: c.get<number>('DB_POOL_MAX', 10),
        poolMin: c.get<number>('DB_POOL_MIN', 1),
        requestTimeoutMs: c.get<number>('DB_REQUEST_TIMEOUT_MS', 6000),
        caFile: c.get<string>('DB_TLS_CA_FILE'),
        appName: 'hce-auth-service',
      }),
    }),
  ],
  controllers: [AuthNatsController, AdminNatsController],
  providers: [operationObserverProvider, ...adapters, ...useCases, SeedDemoUsers],
})
export class AuthModule {}
