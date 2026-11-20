import { commonEnvSchema, mssqlEnvSchema } from '@hce/common';
import Joi from 'joi';

export const authEnvSchema = Joi.object({
  ...commonEnvSchema,
  ...mssqlEnvSchema,
  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_ISSUER: Joi.string().default('hce-auth-service'),
  JWT_AUDIENCE: Joi.string().default('hce-api'),
  JWT_ACCESS_TTL_MIN: Joi.number().integer().min(1).max(30).default(30),
  JWT_REFRESH_TTL_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(24 * 7)
    .default(8),
  SEED_DEMO_USERS: Joi.boolean().default(false),
  SEED_USERS_PASSWORD: Joi.when('SEED_DEMO_USERS', {
    is: true,
    then: Joi.string().min(14).pattern(/[A-Z]/).pattern(/[a-z]/).pattern(/[0-9]/).required(),
    otherwise: Joi.string().optional(),
  }),
});

export function decodePem(value: string): string {
  const v = value.trim();
  if (v.startsWith('-----BEGIN')) return v.replace(/\\n/g, '\n');
  return Buffer.from(v, 'base64').toString('utf8');
}
