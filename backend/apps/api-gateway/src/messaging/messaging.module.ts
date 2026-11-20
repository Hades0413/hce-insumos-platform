import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { natsClientOptions, splitCsv } from '@hce/common';
import { AUTH_CLIENT, GatewayEnv, INVENTORY_CLIENT } from '../config/gateway.config';

const natsFromConfig = (c: ConfigService<GatewayEnv, true>) => ({
  servers: splitCsv(c.get('NATS_SERVERS', { infer: true })),
  user: c.get('NATS_USER', { infer: true }),
  pass: c.get('NATS_PASSWORD', { infer: true }),
  tlsCaFile: c.get('NATS_TLS_CA_FILE', { infer: true }),
});

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_CLIENT,
        inject: [ConfigService],
        useFactory: (c: ConfigService<GatewayEnv, true>) =>
          natsClientOptions(AUTH_CLIENT, natsFromConfig(c), 'api-gateway:auth'),
      },
      {
        name: INVENTORY_CLIENT,
        inject: [ConfigService],
        useFactory: (c: ConfigService<GatewayEnv, true>) =>
          natsClientOptions(INVENTORY_CLIENT, natsFromConfig(c), 'api-gateway:inventory'),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule {}
