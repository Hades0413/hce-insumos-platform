import { ClientProviderOptions, NatsOptions, Transport } from '@nestjs/microservices';

export interface NatsConnectionConfig {
  servers: string[];
  user: string;
  pass: string;
  tlsCaFile?: string;
}

function connection(config: NatsConnectionConfig) {
  return {
    servers: config.servers,
    user: config.user,
    pass: config.pass,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 1_000,
    ...(config.tlsCaFile ? { tls: { caFile: config.tlsCaFile } } : {}),
  };
}

export function natsServerOptions(config: NatsConnectionConfig, queue: string, name: string): NatsOptions {
  return {
    transport: Transport.NATS,
    options: {
      ...connection(config),
      queue,
      name,
      gracefulShutdown: true,
      gracePeriod: 5_000,
    },
  };
}

export function natsBroadcastSubscriberOptions(config: NatsConnectionConfig, name: string): NatsOptions {
  return { transport: Transport.NATS, options: { ...connection(config), name } };
}

export function natsClientOptions(
  name: string | symbol,
  config: NatsConnectionConfig,
  clientName: string,
): ClientProviderOptions {
  return { name, transport: Transport.NATS, options: { ...connection(config), name: clientName } };
}
