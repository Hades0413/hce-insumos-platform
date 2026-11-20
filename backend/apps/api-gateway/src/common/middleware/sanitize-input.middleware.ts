import { Injectable, NestMiddleware } from '@nestjs/common';
import { AppError } from '@hce/core';
import type { NextFunction, Request, Response } from 'express';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CONTROL_CHARS = new RegExp(
  // eslint-disable-next-line no-control-regex -- intencional: detecta y elimina caracteres de control
  '[\\u0000-\\u0008\\u000b-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]',
  'g',
);
const LIMITS = { depth: 8, keys: 2_000, stringLength: 10_000 } as const;

interface Budget {
  keys: number;
}

@Injectable()
export class SanitizeInputMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const budget: Budget = { keys: 0 };
    if (req.body !== undefined && req.body !== null) {
      (req as { body: unknown }).body = sanitize(req.body, 0, budget, 'body');
    }
    assertSafe(req.query, 0, budget, 'query');
    next();
  }
}

function reject(path: string, message: string): never {
  throw AppError.validation('La solicitud contiene datos no permitidos.', [{ field: path, message }]);
}

export function sanitize(value: unknown, depth: number, budget: Budget, path: string): unknown {
  if (depth > LIMITS.depth) reject(path, 'Estructura demasiado anidada');
  if (typeof value === 'string') {
    if (value.length > LIMITS.stringLength) reject(path, 'Texto demasiado largo');
    return value.normalize('NFC').replace(CONTROL_CHARS, '');
  }
  if (Array.isArray(value)) return value.map((v, i) => sanitize(v, depth + 1, budget, `${path}[${i}]`));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) reject(`${path}.${key}`, 'Clave no permitida');
      if (++budget.keys > LIMITS.keys) reject(path, 'Demasiados campos');
      out[key] = sanitize(v, depth + 1, budget, `${path}.${key}`);
    }
    return Object.assign({}, out);
  }
  return value;
}

function assertSafe(value: unknown, depth: number, budget: Budget, path: string): void {
  if (depth > LIMITS.depth) reject(path, 'Estructura demasiado anidada');
  if (typeof value === 'string') {
    if (value.length > LIMITS.stringLength) reject(path, 'Texto demasiado largo');
    if (CONTROL_CHARS.test(value)) {
      CONTROL_CHARS.lastIndex = 0;
      reject(path, 'Caracteres no permitidos');
    }
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) reject(`${path}.${key}`, 'Clave no permitida');
      if (++budget.keys > LIMITS.keys) reject(path, 'Demasiados campos');
      assertSafe(v, depth + 1, budget, `${path}.${key}`);
    }
  }
}
