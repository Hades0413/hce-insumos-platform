import { Rol } from '@hce/contracts';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  /** exp del JWT en epoch segundos */
  exp: number;
}

export interface GatewayRequest extends Request {
  user?: AuthenticatedUser;
  requestId: string;
  idempotencyKey?: string;
}
