import { Rol } from './auth';

/** Identidad ya verificada por el API Gateway (JWT) que viaja al microservicio. */
export interface RequestContext {
  readonly userId: string;
  readonly rol: Rol;
  readonly requestId: string;
}

/** Sobre estándar de todo mensaje gateway -> microservicio. */
export interface MessageEnvelope<T> {
  readonly ctx: RequestContext;
  readonly data: T;
}
