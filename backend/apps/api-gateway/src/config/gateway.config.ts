import { commonEnvSchema } from '@hce/common';
import Joi from 'joi';

export const gatewayEnvSchema = Joi.object({
  ...commonEnvSchema,
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string()
    .required()
    .custom((value: string, helpers) => {
      if (value.split(',').some((o) => o.trim() === '*')) return helpers.error('any.invalid');
      return value;
    }, 'sin comodines'),
  JWT_PUBLIC_KEY: Joi.string().required(),
  JWT_ISSUER: Joi.string().default('hce-auth-service'),
  JWT_AUDIENCE: Joi.string().default('hce-api'),
  COOKIE_SECURE: Joi.boolean().default(true),
  COOKIE_DOMAIN: Joi.string().hostname().optional(),
  CSRF_SECRET: Joi.string().min(32).required(),
  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(300),
  TRUST_PROXY: Joi.alternatives(Joi.boolean(), Joi.number().integer().min(0), Joi.string()).default(false),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  RPC_TIMEOUT_MS: Joi.number().integer().min(500).max(60_000).default(8_000),
  JWT_REFRESH_TTL_HOURS: Joi.number().integer().min(1).default(8),
  BODY_LIMIT: Joi.string().default('100kb'),
});

export interface GatewayEnv {
  NODE_ENV: string;
  LOG_LEVEL: string;
  LOG_PRETTY: boolean;
  METRICS_PORT: number;
  NATS_SERVERS: string;
  NATS_USER: string;
  NATS_PASSWORD: string;
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGINS: string;
  JWT_PUBLIC_KEY: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  COOKIE_SECURE: boolean;
  COOKIE_DOMAIN?: string;
  CSRF_SECRET: string;
  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;
  TRUST_PROXY: boolean | number | string;
  SWAGGER_ENABLED: boolean;
  RPC_TIMEOUT_MS: number;
  JWT_REFRESH_TTL_HOURS: number;
  BODY_LIMIT: string;
}

export const AUTH_CLIENT = Symbol('AUTH_CLIENT');
export const INVENTORY_CLIENT = Symbol('INVENTORY_CLIENT');

/** Límites estrictos para endpoints sensibles (leídos al cargar el módulo: los decoradores son estáticos). */
export const LOGIN_THROTTLE = { limit: Number(process.env.LOGIN_THROTTLE_LIMIT ?? 10), ttl: 60_000 };
export const REFRESH_THROTTLE = { limit: 30, ttl: 60_000 };

export function decodePem(value: string): string {
  const v = value.trim();
  if (v.startsWith('-----BEGIN')) return v.replace(/\\n/g, '\n');
  return Buffer.from(v, 'base64').toString('utf8');
}
