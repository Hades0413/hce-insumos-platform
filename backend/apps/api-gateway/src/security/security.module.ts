import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PermissionsChangedStore } from '../auth/revocation/permissions-changed.store';
import { RevokedSessionsStore } from '../auth/revocation/revoked-sessions.store';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AppThrottlerGuard } from '../common/guards/throttler.guard';
import { AuthCookiesService } from '../common/security/auth-cookies.service';
import { CsrfTokenService } from '../common/security/csrf-token.service';
import { decodePem, GatewayEnv } from '../config/gateway.config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService<GatewayEnv, true>) => ({
        publicKey: decodePem(c.get('JWT_PUBLIC_KEY', { infer: true })),
        verifyOptions: {
          algorithms: ['ES256'],
          issuer: c.get('JWT_ISSUER', { infer: true }),
          audience: c.get('JWT_AUDIENCE', { infer: true }),
          clockTolerance: 5,
        },
      }),
    }),
  ],
  providers: [
    RevokedSessionsStore,
    PermissionsChangedStore,
    AuthCookiesService,
    CsrfTokenService,
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [JwtModule, RevokedSessionsStore, PermissionsChangedStore, AuthCookiesService, CsrfTokenService],
})
export class SecurityModule {}
