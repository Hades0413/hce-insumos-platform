import { createHash, randomBytes, randomUUID } from 'node:crypto';

export function generarRefreshToken(): { token: string; hash: Buffer; id: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token), id: randomUUID() };
}

export function hashRefreshToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}

export const REFRESH_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;
