import { commonEnvSchema, mssqlEnvSchema } from '@hce/common';
import Joi from 'joi';

export const inventoryEnvSchema = Joi.object({
  ...commonEnvSchema,
  ...mssqlEnvSchema,
  IGV_RATE: Joi.number().min(0).max(1).default(0.18),
  MARGEN_VENTA: Joi.number().min(0).max(10).default(0.35),
});

export interface InventoryEnv {
  NODE_ENV: string;
  LOG_LEVEL: string;
  LOG_PRETTY: boolean;
  METRICS_PORT: number;
  NATS_SERVERS: string;
  NATS_USER: string;
  NATS_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_ENCRYPT: boolean;
  DB_TRUST_SERVER_CERT: boolean;
  DB_POOL_MAX: number;
  DB_POOL_MIN: number;
  DB_REQUEST_TIMEOUT_MS: number;
  DB_TLS_CA_FILE?: string;
  NATS_TLS_CA_FILE?: string;
  IGV_RATE: number;
  MARGEN_VENTA: number;
}
