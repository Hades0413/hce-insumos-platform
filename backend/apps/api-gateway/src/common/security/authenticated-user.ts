import { Permiso, Rol } from '@hce/contracts';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  permisos: Permiso[];
  iat: number;
  sid: string;
  exp: number;
}

export interface GatewayRequest extends Request {
  user?: AuthenticatedUser;
  csrfBinding?: string;
  requestId: string;
  idempotencyKey?: string;
}
