import Joi from 'joi';

/** Reglas de validación de variables compartidas (fail-fast al arrancar). */
export const commonEnvSchema = {
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent').default('info'),
  LOG_PRETTY: Joi.boolean().default(false),
  METRICS_PORT: Joi.number().port().default(9464),
  NATS_SERVERS: Joi.string().required(),
  NATS_USER: Joi.string().required(),
  NATS_PASSWORD: Joi.string().min(12).required(),
};

export const mssqlEnvSchema = {
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(1433),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().min(12).required(),
  DB_ENCRYPT: Joi.boolean().default(true),
  DB_TRUST_SERVER_CERT: Joi.boolean().default(false),
  DB_POOL_MAX: Joi.number().integer().min(1).max(200).default(20),
  DB_POOL_MIN: Joi.number().integer().min(0).default(2),
  DB_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).default(15000),
};

export function splitCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}
