import { ClientProviderOptions, NatsOptions, Transport } from '@nestjs/microservices';

export interface NatsConnectionConfig {
  servers: string[];
  user: string;
  pass: string;
}

/** Opciones del servidor NATS de un microservicio (queue group => balanceo entre réplicas). */
export function natsServerOptions(config: NatsConnectionConfig, queue: string, name: string): NatsOptions {
  return {
    transport: Transport.NATS,
    options: {
      servers: config.servers,
      user: config.user,
      pass: config.pass,
      queue,
      name,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 1_000,
      // Drenado: deja de recibir mensajes y espera a que terminen los en curso
      // antes de cerrar (docker stop_grace_period debe ser mayor).
      gracefulShutdown: true,
      gracePeriod: 5_000,
    },
  };
}

export function natsClientOptions(
  name: string | symbol,
  config: NatsConnectionConfig,
  clientName: string,
): ClientProviderOptions {
  return {
    name,
    transport: Transport.NATS,
    options: {
      servers: config.servers,
      user: config.user,
      pass: config.pass,
      name: clientName,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 1_000,
    },
  };
}
