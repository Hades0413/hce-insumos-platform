import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { buildLoggerParams, MssqlModule } from '@hce/common';
import { LoggerModule } from 'nestjs-pino';
import { AuthUseCases } from './application/auth.use-cases';
import { BootstrapUsersService } from './application/bootstrap-users.service';
import { ACCESS_TOKEN_ISSUER, PASSWORD_HASHER, SESION_REPOSITORY, USUARIO_REPOSITORY } from './domain/ports';
import { authEnvSchema, decodePem } from './infrastructure/config/auth.config';
import { AuthNatsController } from './infrastructure/messaging/auth.nats-controller';
import { MssqlSesionRepository } from './infrastructure/persistence/mssql-sesion.repository';
import { MssqlUsuarioRepository } from './infrastructure/persistence/mssql-usuario.repository';
import { JwtAccessTokenIssuer } from './infrastructure/security/jwt-access-token.issuer';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher';

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
        requestTimeoutMs: c.get<number>('DB_REQUEST_TIMEOUT_MS', 15000),
        appName: 'hce-auth-service',
      }),
    }),
  ],
  controllers: [AuthNatsController],
  providers: [
    AuthUseCases,
    BootstrapUsersService,
    { provide: USUARIO_REPOSITORY, useClass: MssqlUsuarioRepository },
    { provide: SESION_REPOSITORY, useClass: MssqlSesionRepository },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    {
      provide: ACCESS_TOKEN_ISSUER,
      inject: [JwtService, ConfigService],
      useFactory: (jwt: JwtService, c: ConfigService) =>
        new JwtAccessTokenIssuer(jwt, c.get<number>('JWT_ACCESS_TTL_MIN', 30)),
    },
  ],
})
export class AuthModule {}
